import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const mealPlanRouter = router({
  getCurrent: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("week_start_date", input.weekStart)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data ?? null;
    }),

  generate: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      dietaryRestrictions: z.string().optional(),
      country: z.string().optional(),
      diabetesType: z.string().optional(),
      dailyCalorieGoal: z.number().optional(),
      maxDailyCarbs: z.number().optional(),
      maxDailySugar: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const prompt = `Create a 7-day diabetes-friendly meal plan for a person with ${input.diabetesType ?? "type2"} diabetes from ${input.country ?? "South Africa"}.
Daily targets: ~${input.dailyCalorieGoal ?? 1800} calories, max ${input.maxDailyCarbs ?? 130}g carbs, max ${input.maxDailySugar ?? 25}g sugar.
Dietary restrictions: ${input.dietaryRestrictions || "none"}.

Respond ONLY with valid JSON (no markdown):
{
  "days": [
    {
      "day": "Monday",
      "meals": {
        "breakfast": { "name": "string", "calories": number, "carbs_g": number, "description": "string" },
        "lunch": { "name": "string", "calories": number, "carbs_g": number, "description": "string" },
        "dinner": { "name": "string", "calories": number, "carbs_g": number, "description": "string" },
        "snack": { "name": "string", "calories": number, "carbs_g": number, "description": "string" }
      }
    }
  ],
  "weeklyTip": "string"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const planData = JSON.parse(clean);

      // Only include columns guaranteed to exist in the table.
      // country / diabetes_type may not exist if the migration hasn't been
      // applied yet, so we build the row dynamically and silently omit them
      // when the upsert fails.
      const row: Record<string, any> = {
        user_id: ctx.userId,
        week_start_date: input.weekStart,
        plan_json: JSON.stringify(planData),
        dietary_restrictions: input.dietaryRestrictions ?? null,
        updated_at: new Date().toISOString(),
      };

      // Upsert the meal plan — only include columns that exist in the table.
      // The country / diabetes_type columns are intentionally excluded because
      // the migration that adds them has not been applied to the production DB.
      const { data, error } = await supabase
        .from("meal_plans")
        .upsert(row, { onConflict: "user_id,week_start_date" })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),
});
