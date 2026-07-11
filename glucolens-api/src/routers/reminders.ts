import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import { internalError } from "../lib/errors";

export const remindersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", ctx.userId)
      .order("time", { ascending: true });
    if (error) internalError("reminders.list", error);
    return (data || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      time: r.time,
      enabled: r.enabled,
    }));
  }),

  add: protectedProcedure
    .input(z.object({
      type: z.enum(["meal", "water"]),
      label: z.string(),
      time: z.string(), // HH:MM
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from("reminders")
        .insert({ user_id: ctx.userId, ...input, enabled: true })
        .select()
        .single();
      if (error) internalError("reminders.add", error);
      return {
        id: data.id,
        type: data.type,
        label: data.label,
        time: data.time,
        enabled: data.enabled,
      };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.coerce.number().int(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabase
        .from("reminders")
        .update({ enabled: input.enabled })
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) internalError("reminders.toggle", error);
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.coerce.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) internalError("reminders.delete", error);
      return { ok: true };
    }),
});
