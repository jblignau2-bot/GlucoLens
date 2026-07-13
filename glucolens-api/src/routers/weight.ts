import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import { internalError, badRequest } from "../lib/errors";

export const weightRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from("weight_entries")
        .select("*")
        .eq("user_id", ctx.userId)
        .order("logged_at", { ascending: false })
        .limit(input.limit);
      if (error) internalError("weight.list", error);
      return (data || []).map((r: any) => ({
        id: r.id,
        valueKg: r.value_kg,
        weightKg: r.value_kg,
        notes: r.notes ?? null,
        loggedAt: r.logged_at,
      }));
    }),

  add: protectedProcedure
    .input(z.object({
      valueKg: z.number().positive().max(500).optional(),
      weightKg: z.number().positive().max(500).optional(),
      notes: z.string().max(500).optional(),
      loggedAt: z.string().datetime({ offset: true }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const valueKg = input.valueKg ?? input.weightKg;
      if (valueKg == null) badRequest("Weight value is required");
      const { data, error } = await supabase
        .from("weight_entries")
        .insert({
          user_id: ctx.userId,
          value_kg: valueKg,
          notes: input.notes ?? null,
          logged_at: input.loggedAt ?? new Date().toISOString(),
        })
        .select()
        .single();
      if (error) internalError("weight.add", error);
      return { id: data.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().or(z.number()).transform(String) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabase
        .from("weight_entries")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) internalError("weight.delete", error);
      return { ok: true };
    }),
});
