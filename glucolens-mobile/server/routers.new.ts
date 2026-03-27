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
});

// ── Weight Router ─────────────────────────────────────────────────────────────

export const weightRouter = router({
  /** Add a weight entry */
  add: protectedProcedure
    .input(z.object({
      weightKg: z.number().min(10).max(500),
      notes:    z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.insert(weightLogs).values({
        userId:   ctx.userId,
        weightKg: input.weightKg.toString(),
        notes:    input.notes ?? null,
      }).returning();
      return row;
    }),

  /** List weight entries, newest first */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return db.select()
        .from(weightLogs)
        .where(eq(weightLogs.userId, ctx.userId))
        .orderBy(desc(weightLogs.recordedAt))
        .limit(input.limit);
    }),

  /** Delete an entry */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(weightLogs)
        .where(and(eq(weightLogs.id, input.id), eq(weightLogs.userId, ctx.userId)));
      return { success: true };
    }),
});

// ── Reminders Router ──────────────────────────────────────────────────────────

export const remindersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.select()
      .from(reminders)
      .where(eq(reminders.userId, ctx.userId))
      .orderBy(reminders.time);
  }),

  add: protectedProcedure
    .input(z.object({
      type:  z.enum(["meal", "water"]),
      label: z.string().min(1).max(100),
      time:  z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.insert(reminders).values({
        userId:  ctx.userId,
        type:    input.type,
        label:   input.label,
        time:    input.time,
        enabled: true,
      }).returning();
      return row;
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(reminders)
        .set({ enabled: input.enabled })
        .where(and(eq(reminders.id, input.id), eq(reminders.userId, ctx.userId)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(reminders)
        .where(and(eq(reminders.id, input.id), eq(reminders.userId, ctx.userId)));
      return { success: true };
    }),
});

// ── Barcode Analysis ──────────────────────────────────────────────────────────
// Extend the existing food router with this procedure.

export const analyzeBarcodeProc = protectedProcedure
  .input(z.object({ barcode: z.string().min(6).max(20) }))
  .mutation(async ({ ctx, input }) => {
    // 1. Look up product on Open Food Facts
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(input.barcode)}.json?fields=product_name,nutriments,nutrition_grades`;
    const offRes = await fetch(offUrl);
    if (!offRes.ok) throw new Error("Product lookup failed");
    const offData = await offRes.json() as any;

    if (offData.status !== 1) {
      throw new Error(`Product barcode ${input.barcode} not found in Open Food Facts. Try another product or use text mode.`);
    }

    const p = offData.product;
    const n = p.nutriments ?? {};
    const productName = p.product_name ?? "Unknown Product";

    // 2. Build a text description for the AI analyser
    const description = [
      productName,
      n["energy-kcal_100g"] ? `${Math.round(n["energy-kcal_100g"])} kcal per 100g` : "",
      n["carbohydrates_100g"] ? `${n["carbohydrates_100g"]}g carbs per 100g` : "",
      n["sugars_100g"] ? `${n["sugars_100g"]}g sugars per 100g` : "",
      n["proteins_100g"] ? `${n["proteins_100g"]}g protein per 100g` : "",
      n["fat_100g"] ? `${n["fat_100g"]}g fat per 100g` : "",
      n["fibler_100g"] ? `${n["fiber_100g"]}g fibre per 100g` : "",
    ].filter(Boolean).join(", ");

    // 3. Run AI analysis on the text description (reuse existing analyzeFood logic)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
    const prompt = buildFoodTextPrompt(description);  // reuse existing helper from routers.ts
