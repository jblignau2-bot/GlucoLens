import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { openai } from "../openai";
import { supabase } from "../supabase";
import { aiFailure } from "../lib/errors";

export const chatRouter = router({
  ask: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(1200),
      context: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("diabetes_type, daily_calorie_goal, max_daily_carbs, max_daily_sugar, allergies, medication")
        .eq("user_id", ctx.userId)
        .maybeSingle();

      // Only include allergies/medication in the prompt when non-empty
      const profileForPrompt = profile
        ? {
            diabetes_type: profile.diabetes_type,
            daily_calorie_goal: profile.daily_calorie_goal,
            max_daily_carbs: profile.max_daily_carbs,
            max_daily_sugar: profile.max_daily_sugar,
            ...(profile.allergies ? { allergies: profile.allergies } : {}),
            ...(profile.medication ? { medication: profile.medication } : {}),
          }
        : null;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 650,
        messages: [
          {
            role: "system",
            content:
              "You are GlucoBot, a careful diabetes food coach inside GlucoLens. Give practical, plain-language guidance for food choices, glucose patterns, meal planning, and app usage. Do not diagnose, prescribe, or replace a clinician. For severe symptoms, very high/low glucose, DKA signs, chest pain, confusion, or pregnancy concerns, tell the user to seek urgent medical care. Keep answers concise and actionable.",
          },
          {
            role: "user",
            content: JSON.stringify({
              profile: profileForPrompt,
              context: input.context ?? null,
              question: input.message,
            }),
          },
        ],
      });

      const answer = response.choices[0]?.message?.content?.trim();
      if (!answer) aiFailure("chat.ask", "empty completion", "GlucoBot did not return a response. Please try again.");
      return { answer };
    }),
});
