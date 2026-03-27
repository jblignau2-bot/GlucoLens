/**
 * GlucoLens — New tRPC Router Procedures
 *
 * This file contains the additional tRPC procedures that must be
 * MERGED into the existing server/routers.ts to support the mobile
 * app's new features:
 *
 *   1.  glucose.*    — Blood glucose log CRUD
 *   2.  weight.*     — Weight log CRUD
 *   3.  food.analyzeBarcode — Open Food Facts barcode lookup + AI analysis
 *   4.  food.exportCsv      — CSV export of all food logs
 *   5.  reports.monthly     — Monthly health report PDF generation
 *   6.  reminders.*  — Reminder CRUD
 *
 * HOW TO USE:
 *   Copy the router objects below and add them to the `appRouter`
 *   in server/routers.ts, e.g.:
 *
 *     export const appRouter = router({
 *       // ... existing procedures ...
 *       glucose:  glucoseRouter,
 *       weight:   weightRouter,
 *       reminders: remindersRouter,
 *       reports:  reportsRouter,
 *     });
 *
 * DEPENDENCIES (add to server package.json if not present):
 *   pdfkit          ^0.14.0   — PDF generation
 *   json2csv        ^6.0.0    — CSV serialisation
 *   node-fetch      ^3.0.0    — HTTP requests to Open Food Facts API
 *
 * NOTE: All procedures require the user to be authenticated via
 * Supabase JWT. The existing `protectedProcedure` middleware is used.
 */

import { z } from "zod";
import { router, protectedProcedure } from "./trpc";  // adjust path as needed
import { db } from "./db";                            // adjust path as needed
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import {
  glucoseLogs,
  weightLogs,
  foodLogs,
  reminders,
} from "../drizzle/schema";                          // adjust path as needed

// ── Glucose Router ────────────────────────────────────────────────────────────

export const glucoseRouter = router({
  /** Add a blood glucose reading */
  add: protectedProcedure
    .input(z.object({
      valueMmol:   z.number().min(0.5).max(33.3),
      readingType: z.enum(["fasting", "pre-meal", "post-meal", "bedtime", "random"]).default("random"),
      notes:       z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.insert(glucoseLogs).values({
        userId:      ctx.userId,
        valueMmol:   input.valueMmol.toString(),
        readingType: input.readingType,
        notes:       input.notes ?? null,
      }).returning();
      return row;
    }),

  /** List glucose readings, newest first */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(50),
      from:  z.string().optional(),  // ISO date string
      to:    z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(glucoseLogs.userId, ctx.userId)];
      if (input.from) conditions.push(gte(glucoseLogs.recordedAt, new Date(input.from)));
      if (input.to)   conditions.push(lte(glucoseLogs.recordedAt, new Date(input.to)));

      return db.select()
        .from(glucoseLogs)
        .where(and(...conditions))
        .orderBy(desc(glucoseLogs.recordedAt))
        .limit(input.limit);
    }),

  /** Delete a reading */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(glucoseLogs)
        .where(and(eq(glucoseLogs.id, input.id), eq(glucoseLogs.userId, ctx.userId)));
      return { success: true };
    }),
