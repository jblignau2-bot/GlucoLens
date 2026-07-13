import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import { internalError, badRequest } from "../lib/errors";

const BUCKET = "progress-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Storage object path for a user's photo (one per user+week+angle). */
function photoPath(userId: string, week: number, angle: string): string {
  return `${userId}/week${week}-${angle}.jpg`;
}

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
    return Promise.all(
      (data ?? []).map(async (r: any) => {
        let photoUrl: string | undefined;
        if (r.storage_path) {
          const { data: signed, error: signError } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(r.storage_path, SIGNED_URL_TTL_SECONDS);
          if (signError) internalError("goals.listPhotos.signedUrl", signError);
          photoUrl = signed?.signedUrl;
        }
        return {
          id: r.id,
          week: r.week,
          angle: r.angle,
          note: r.note ?? "",
          createdAt: r.created_at,
          photoUrl,
          // Legacy rows saved before the storage migration
          photoBase64: r.storage_path ? undefined : r.photo_base64 ?? undefined,
        };
      })
    );
  }),

  /** Upsert a progress photo (one per user+week+angle) — stored in Supabase Storage */
  savePhoto: protectedProcedure
    .input(z.object({
      week: z.number().min(1).max(4),
      angle: z.enum(["front", "side", "back"]),
      photoBase64: z.string().min(1).max(8_000_000, "Image too large — keep under 5MB"),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Accept raw base64 or a data URI; decode server-side
      const base64 = input.photoBase64.replace(/^data:image\/\w+;base64,/, "");
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64, "base64");
      } catch {
        badRequest("Invalid image data");
      }
      if (buffer.length === 0) badRequest("Invalid image data");

      const path = photoPath(ctx.userId, input.week, input.angle);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
      if (uploadError) internalError("goals.savePhoto.upload", uploadError);

      const { data, error } = await supabase
        .from("progress_photos")
        .upsert(
          {
            user_id: ctx.userId,
            week: input.week,
            angle: input.angle,
            storage_path: path,
            photo_base64: null,
            note: input.note ?? "",
          },
          { onConflict: "user_id,week,angle" }
        )
        .select()
        .single();
      if (error) internalError("goals.savePhoto", error);
      return { id: data.id };
    }),

  /** Delete a progress photo (DB row + storage object) */
  deletePhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { data: row, error: fetchError } = await supabase
        .from("progress_photos")
        .select("id, storage_path")
        .eq("id", input.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (fetchError) internalError("goals.deletePhoto.fetch", fetchError);

      const { error } = await supabase
        .from("progress_photos")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) internalError("goals.deletePhoto", error);

      if (row?.storage_path) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove([row.storage_path]);
        // Row is already gone — log but don't fail the request
        if (removeError) console.error("[goals.deletePhoto.storage]", removeError.message);
      }
      return { ok: true };
    }),
});
