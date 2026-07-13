import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import { internalError, badRequest } from "../lib/errors";

// Client may send "mmol"/"mgdl" (legacy) or "mmol/L"/"mg/dL" (contract) —
// normalize to the stored values "mmol"/"mgdl".
const unitSchema = z
  .enum(["mmol", "mgdl", "mmol/L", "mg/dL"])
  .transform((u) => (u === "mg/dL" ? "mgdl" : u === "mmol/L" ? "mmol" : u));

export const glucoseRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from("glucose_readings")
        .select("*")
        .eq("user_id", ctx.userId)
        .order("logged_at", { ascending: false })
        .limit(input.limit);
      if (error) internalError("glucose.list", error);
      return (data || []).map((r: any) => ({
        id: r.id,
        value: r.value,
        valueMmol: r.unit === "mgdl" ? Math.round((r.value / 18) * 10) / 10 : r.value,
        unit: r.unit ?? "mmol",
        readingType: r.reading_type ?? null,
        notes: r.notes ?? null,
        loggedAt: r.logged_at,
      }));
    }),

  add: protectedProcedure
    .input(z.object({
      value: z.number().positive().max(2000).optional(),
      valueMmol: z.number().positive().max(2000).optional(),
      readingType: z.string().max(30).optional(),
      notes: z.string().max(500).optional(),
      unit: unitSchema.default("mmol"),
      loggedAt: z.string().datetime({ offset: true }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const value = input.value ?? input.valueMmol;
      if (value == null) badRequest("Glucose value is required");
      const { data, error } = await supabase
        .from("glucose_readings")
        .insert({
          user_id: ctx.userId,
          value,
          unit: input.unit,
          reading_type: input.readingType ?? null,
          notes: input.notes ?? null,
          logged_at: input.loggedAt ?? new Date().toISOString(),
        })
        .select()
        .single();
      if (error) internalError("glucose.add", error);
      return { id: data.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().or(z.number()).transform(String) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabase
        .from("glucose_readings")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) internalError("glucose.delete", error);
      return { ok: true };
    }),
});
