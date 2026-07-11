import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import { openai } from "../openai";
import { internalError, aiFailure } from "../lib/errors";
import { diabetesTypeSchema, countrySchema, promptText } from "../lib/validation";

// ─── AI output schema ────────────────────────────────────────────────────────
const mealSchema = z.object({
  name: z.coerce.string(),
  description: z.coerce.string().default(""),
  calories: z.coerce.number().default(0),
  carbs_g: z.coerce.number().default(0),
  protein_g: z.coerce.number().default(0),
  fat_g: z.coerce.number().default(0),
  sugar_g: z.coerce.number().default(0),
  fiber_g: z.coerce.number().default(0),
  ingredients: z
    .array(z.object({
      name: z.coerce.string(),
      amount: z.coerce.string().default(""),
      grams: z.coerce.number().default(0),
    }))
    .default([]),
  cookingInstructions: z.coerce.string().default(""),
}).passthrough();

const daySchema = z.object({
  day: z.coerce.string(),
  meals: z.object({
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema,
    snack: mealSchema,
  }),
  dailyTotals: z.record(z.coerce.number()).default({}),
}).passthrough();

const planSchema = z.object({
  days: z.array(daySchema).min(7),
  weeklyTip: z.coerce.string().default(""),
}).passthrough();

export const mealPlanRouter = router({
  getCurrent: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("week_start", input.weekStart)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        userId: data.user_id,
        weekStart: data.week_start,
        planJson: data.plan_json,
        createdAt: data.created_at ?? null,
      };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        weekStart: z.string(),
        dietaryRestrictions: promptText(200).optional(),
        country: countrySchema.optional(),
        diabetesType: diabetesTypeSchema.optional(),
        dailyCalorieGoal: z.number().optional(),
        maxDailyCarbs: z.number().optional(),
        maxDailySugar: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const country = input.country ?? "South Africa";
      const diabetesType = input.diabetesType ?? "type2";
      const calorieGoal = input.dailyCalorieGoal ?? 1800;
      const maxCarbs = input.maxDailyCarbs ?? 130;
      const maxSugar = input.maxDailySugar ?? 25;
      const restrictions = input.dietaryRestrictions || "none";

      // --- 1. Call OpenAI -----------------------------------------------
      let planData: any;
      try {
        const prompt = `You are a certified diabetes nutritionist. Create a detailed 7-day meal plan for a person with ${diabetesType} diabetes living in ${country}.

DAILY TARGETS:
- Calories: ~${calorieGoal} kcal
- Max carbs: ${maxCarbs}g
- Max sugar: ${maxSugar}g
- Dietary restrictions: ${restrictions}

IMPORTANT:
- Use meals and ingredients commonly available in ${country}
- Include realistic cooking instructions
- List every ingredient with exact gram amounts
- Each meal must have full macro breakdown
- Calculate accurate daily totals
- Keep daily totals within the targets above

Respond ONLY with valid JSON (no markdown, no backticks). Use this EXACT structure:

{
  "days": [
    {
      "day": "Monday",
      "meals": {
        "breakfast": {
          "name": "Meal name",
          "description": "One-line summary",
          "calories": 350,
          "carbs_g": 25,
          "protein_g": 20,
          "fat_g": 15,
          "sugar_g": 5,
          "fiber_g": 4,
          "ingredients": [
            { "name": "Ingredient", "amount": "2 large", "grams": 120 }
          ],
          "cookingInstructions": "Step 1. Do this. Step 2. Do that. Step 3. Serve."
        },
        "lunch": { ... same structure ... },
        "dinner": { ... same structure ... },
        "snack": { ... same structure ... }
      },
      "dailyTotals": {
        "calories": 1750,
        "carbs_g": 120,
        "protein_g": 90,
        "fat_g": 65,
        "sugar_g": 20,
        "fiber_g": 28
      }
    }
  ],
  "weeklyTip": "A helpful diabetes management tip for the week."
}

Generate ALL 7 days (Monday through Sunday). Each day MUST have breakfast, lunch, dinner, and snack.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 16384,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("empty completion");
        let clean = content
          .replace(/^\uFEFF/, "")
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const firstBrace = clean.indexOf("{");
        const lastBrace = clean.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          clean = clean.slice(firstBrace, lastBrace + 1);
        }
        const parsed = planSchema.safeParse(JSON.parse(clean));
        if (!parsed.success) throw new Error(parsed.error.message);
        planData = parsed.data;
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        aiFailure("mealPlan.generate", err);
      }

      // Inject user limits into the plan so the frontend can display them
      planData.userLimits = {
        dailyCalories: calorieGoal,
        maxCarbs,
        maxSugar,
      };

      // --- 2. Upsert into Supabase -------------------------------------
      const row: Record<string, any> = {
        user_id: ctx.userId,
        week_start: input.weekStart,
        plan_json: JSON.stringify(planData),
      };

      const { data, error } = await supabase
        .from("meal_plans")
        .upsert(row, { onConflict: "user_id,week_start" })
        .select()
        .single();

      if (error) internalError("mealPlan.generate", error);

      return {
        id: data.id,
        userId: data.user_id,
        weekStart: data.week_start,
        planJson: data.plan_json,
        createdAt: data.created_at ?? null,
      };
    }),
});
