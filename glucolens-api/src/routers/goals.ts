import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import { internalError } from "../lib/errors";

export const goalsRouter = router({

  /** List progress photos for the user, grouped by week */
  listPhotos: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
    const { data, error } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", ctx.userId)
      .order("week", { ascending: true })
      .order("angle", { ascending: true })
      .limit(input?.limit ?? 50);
    if (error) internalError("goals.listPhotos", error);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      week: r.week,
      angle: r.angle,
      photoBase64: r.photo_base64,
      note: r.note ?? "",
      createdAt: r.created_at,
    }));
  }),

  /** Upsert a progress photo (one per user+week+angle) */
  savePhoto: protectedProcedure
    .input(z.object({
      week: z.number().min(1).max(4),
      angle: z.enum(["front", "side", "back"]),
      photoBase64: z.string().max(8_000_000, "Image too large — keep under 5MB"),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from("progress_photos")
        .upsert(
          {
            user_id: ctx.userId,
            week: input.week,
            angle: input.angle,
            photo_base64: input.photoBase64,
            note: input.note ?? "",
          },
          { onConflict: "user_id,week,angle" }
        )
        .select()
        .single();
      if (error) internalError("goals.savePhoto", error);
      return { id: data.id };
    }),

  /** Delete a progress photo */
  deletePhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabase
        .from("progress_photos")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) internalError("goals.deletePhoto", error);
      return { ok: true };
    }),
});
