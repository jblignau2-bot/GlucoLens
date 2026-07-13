import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";
import { openai } from "../openai";
import { internalError, notFound, aiFailure } from "../lib/errors";
import { diabetesTypeSchema, countrySchema } from "../lib/validation";

// ─── Helper functions ────────────────────────────────────────────────────────
function tryParse(val: any, fallback: any) {
  if (val == null) return fallback;
  // JSONB columns return as objects already, TEXT columns return as strings
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return fallback;
}

// ─── AI analysis output schema ───────────────────────────────────────────────
const ratingValueSchema = z.enum(["safe", "moderate", "risky"]);
const ratingSchema = z.object({
  rating: ratingValueSchema.catch("moderate"),
  reason: z.coerce.string().catch(""),
});

const analysisSchema = z.object({
  mealName: z.coerce.string().default("Unknown meal"),
  identifiedFoods: z.array(z.coerce.string()).default([]),
  nutrition: z.object({
    calories: z.coerce.number(),
    totalSugar_g: z.coerce.number(),
    totalCarbs_g: z.coerce.number(),
    glycemicIndex: z.coerce.number(),
    glycemicLoad: z.coerce.number(),
    protein_g: z.coerce.number(),
    fat_g: z.coerce.number(),
    fiber_g: z.coerce.number(),
  }),
  diabetesRating: z.object({
    type1: ratingSchema,
    type2: ratingSchema,
  }),
  whyRisky: z.array(z.coerce.string()).default([]),
  healthierAlternatives: z
    .array(z.object({ name: z.coerce.string(), benefit: z.coerce.string().default("") }))
    .default([]),
  foodsToAvoid: z.array(z.coerce.string()).default([]),
  itemBreakdown: z.array(z.any()).default([]),
});

// ─── Shared analysis prompt ──────────────────────────────────────────────────
function buildAnalysisPrompt(country: string, diabetesType: string) {
  return `You are a diabetes nutrition expert. Analyse this meal and respond ONLY with valid JSON matching this exact structure (no markdown, no explanation):
{
  "mealName": "string",
  "identifiedFoods": ["string"],
  "nutrition": {
    "calories": number,
    "totalSugar_g": number,
    "totalCarbs_g": number,
    "glycemicIndex": number,
    "glycemicLoad": number,
    "protein_g": number,
    "fat_g": number,
    "fiber_g": number
  },
  "diabetesRating": {
    "type1": { "rating": "safe"|"moderate"|"risky", "reason": "string" },
    "type2": { "rating": "safe"|"moderate"|"risky", "reason": "string" }
  },
  "whyRisky": ["string"],
  "healthierAlternatives": [{ "name": "string", "benefit": "string" }],
  "foodsToAvoid": ["string"],
  "itemBreakdown": [{
    "name": "string",
    "portion": "string",
    "calories": number,
    "sugar_g": number,
    "carbs_g": number,
    "protein_g": number,
    "fat_g": number,
    "fiber_g": number,
    "glycemicIndex": number,
    "note": "string"
  }]
}
Country context: ${country || "unknown"}. Primary diabetes concern: ${diabetesType || "type2"}.
Rate items based on glycemic impact, sugar content, and portion size. Be specific.`;
}

function parseAnalysis(content: string) {
  // Strip markdown fencing, BOM, and any text before/after the JSON
  let clean = content
    .replace(/^\uFEFF/, "")
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  // Extract only the JSON object if AI added extra text
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(clean);
  } catch (err) {
    aiFailure("food.parseAnalysis", err);
  }
  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) {
    aiFailure("food.parseAnalysis", parsed.error.message);
  }
  return parsed.data;
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const foodRouter = router({

  list: protectedProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      rating: z.enum(["safe", "moderate", "risky"]).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", ctx.userId)
        .order("logged_at", { ascending: false })
        .limit(input.limit);

      if (input.from) query = query.gte("logged_at", input.from);
      if (input.to) query = query.lte("logged_at", input.to);
      if (input.search) query = query.ilike("meal_name", `%${input.search}%`);

      const { data, error } = await query;
      if (error) internalError("food.list", error);

      let results = data || [];
      if (input.rating) {
        results = results.filter(
          (r: any) => r.rating_type2 === input.rating || r.rating_type1 === input.rating
        );
      }
      return results.map((r: any) => ({
        id: r.id,
        mealName: r.meal_name,
        // imageUrl not in original schema
        calories: r.calories,
        totalSugar: r.total_sugar,
        totalCarbs: r.total_carbs,
        glycemicIndex: r.glycemic_index,
        glycemicLoad: r.glycemic_load,
        protein: r.protein,
        fat: r.fat,
        fiber: r.fiber,
        ratingType1: r.rating_type1,
        ratingType2: r.rating_type2,
        reasonType1: r.reason_type1,
        reasonType2: r.reason_type2,
        whyRisky: tryParse(r.why_risky, []),
        healthierAlternatives: tryParse(r.healthier_alternatives, []),
        foodsToAvoid: tryParse(r.foods_to_avoid, []),
        itemBreakdown: tryParse(r.item_breakdown, []),
        identifiedFoods: tryParse(r.identified_foods, []),
        loggedAt: r.logged_at,
      }));
    }),

  log: protectedProcedure
    .input(z.object({
      mealName: z.string(),
      imageUrl: z.string().optional(),
      identifiedFoods: z.array(z.string()),
      nutrition: z.object({
        calories: z.number(),
        totalSugar_g: z.number(),
        totalCarbs_g: z.number(),
        glycemicIndex: z.number(),
        glycemicLoad: z.number(),
        protein_g: z.number(),
        fat_g: z.number(),
        fiber_g: z.number(),
      }),
      diabetesRating: z.object({
        type1: z.object({ rating: z.enum(["safe", "moderate", "risky"]), reason: z.string() }),
        type2: z.object({ rating: z.enum(["safe", "moderate", "risky"]), reason: z.string() }),
      }),
      whyRisky: z.array(z.string()),
      healthierAlternatives: z.array(z.object({ name: z.string(), benefit: z.string() })),
      foodsToAvoid: z.array(z.string()),
      itemBreakdown: z.array(z.any()).optional(),
      country: z.string().max(60).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from("food_logs")
        .insert({
          user_id: ctx.userId,
          meal_name: input.mealName,
          identified_foods: input.identifiedFoods,
          calories: input.nutrition.calories,
          total_sugar: input.nutrition.totalSugar_g,
          total_carbs: input.nutrition.totalCarbs_g,
          glycemic_index: input.nutrition.glycemicIndex,
          glycemic_load: input.nutrition.glycemicLoad,
          protein: input.nutrition.protein_g,
          fat: input.nutrition.fat_g,
          fiber: input.nutrition.fiber_g,
          rating_type1: input.diabetesRating.type1.rating,
          rating_type2: input.diabetesRating.type2.rating,
          reason_type1: input.diabetesRating.type1.reason,
          reason_type2: input.diabetesRating.type2.reason,
          why_risky: input.whyRisky,
          healthier_alternatives: input.healthierAlternatives,
          foods_to_avoid: input.foodsToAvoid,
          item_breakdown: input.itemBreakdown ?? [],
          logged_at: new Date().toISOString(),
          country: input.country,
        })
        .select()
        .single();
      if (error) internalError("food.log", error);
      return { id: data.id };
    }),

  analyze: protectedProcedure
    .input(z.object({
      imageBase64: z.string().max(5_000_000, "Image too large"),
      country: countrySchema.optional(),
      diabetesType: diabetesTypeSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: buildAnalysisPrompt(input.country ?? "", input.diabetesType ?? "type2") },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.imageBase64}`, detail: "low" } },
          ],
        }],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) aiFailure("food.analyze", "empty completion");
      return parseAnalysis(content);
    }),

  analyzeText: protectedProcedure
    .input(z.object({
      description: z.string().max(2000, "Description too long"),
      country: countrySchema.optional(),
      diabetesType: diabetesTypeSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `${buildAnalysisPrompt(input.country ?? "", input.diabetesType ?? "type2")}\n\nMeal description: ${input.description}`,
        }],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) aiFailure("food.analyzeText", "empty completion");
      return parseAnalysis(content);
    }),

  analyzeBarcode: protectedProcedure
    .input(z.object({
      barcode: z.string().regex(/^\d{8,14}$/, "Invalid barcode format"),
      country: countrySchema.optional(),
      diabetesType: diabetesTypeSchema.optional(),
    }))
    .mutation(async ({ input }) => {
      // Fetch from Open Food Facts (free, no API key)
      let res: Response;
      try {
        res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${input.barcode}.json`, {
          headers: { "User-Agent": "GlucoLens/1.0" },
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
      } catch (err: any) {
        aiFailure("food.analyzeBarcode", err, "Could not look up barcode. Check your connection and try again.");
      }
      const data = await res.json() as any;

      // Not-found comes first — OFF returns status 0 when the barcode is unknown
      if (data.status !== 1 || !data.product) {
        notFound("Product not found. Try scanning the photo instead.");
      }

      const p = data.product;
      if (!p.nutriments) {
        notFound("Product data is incomplete. Try scanning the photo instead.");
      }

      const n = p.nutriments;
      // Return null (unknown) rather than 0/NaN when a value is missing or unparseable
      const per100 = (key: string): number | null => {
        const raw = n[key + "_100g"] ?? n[key];
        if (raw == null) return null;
        const v = parseFloat(String(raw));
        return Number.isFinite(v) ? v : null;
      };
      const parsedServing = parseFloat(String(p.serving_quantity ?? ""));
      const servingG = Number.isFinite(parsedServing) && parsedServing > 0 ? parsedServing : 100;
      const scale = servingG / 100;
      const scaled = (key: string, decimals = 1): number | null => {
        const v = per100(key);
        if (v == null) return null;
        const f = Math.pow(10, decimals);
        return Math.round(v * scale * f) / f;
      };

      const sugar = scaled("sugars");
      const carbs = scaled("carbohydrates");

      const nutrition = {
        calories: scaled("energy-kcal", 0),
        totalSugar_g: sugar,
        totalCarbs_g: carbs,
        glycemicIndex: 50, // OFF doesn't have GI — use moderate default
        glycemicLoad: carbs != null ? Math.round(carbs * 0.5 * 10) / 10 : null,
        protein_g: scaled("proteins"),
        fat_g: scaled("fat"),
        fiber_g: scaled("fiber"),
      };

      // Rate only from finite values — missing data must not read as "safe"
      const dataIncomplete = sugar == null || carbs == null;
      const rating = dataIncomplete
        ? "moderate"
        : sugar > 15 || carbs > 45 ? "risky" : sugar > 8 || carbs > 25 ? "moderate" : "safe";

      const reasonType1 = dataIncomplete
        ? "Nutrition data incomplete — carb content unknown, check the label before dosing insulin."
        : `${carbs}g carbs per serving — plan insulin accordingly.`;
      const reasonType2 = dataIncomplete
        ? "Nutrition data incomplete — treat with caution and check the label."
        : sugar > 15
          ? `High sugar (${sugar}g) — limit portion size.`
          : `${sugar}g sugar per serving — ${rating} for blood sugar control.`;

      return {
        mealName: p.product_name ?? "Unknown product",
        identifiedFoods: [p.product_name ?? "Unknown"],
        nutrition,
        diabetesRating: {
          type1: { rating, reason: reasonType1 },
          type2: { rating, reason: reasonType2 },
        },
        whyRisky:
          sugar != null && sugar > 15
            ? [`High sugar content: ${sugar}g per serving`]
            : dataIncomplete
              ? ["Nutrition data incomplete for this product"]
              : [],
        healthierAlternatives: [],
        foodsToAvoid: [],
        itemBreakdown: [{
          name: p.product_name ?? "Product",
          portion: `${servingG}g serving`,
          calories: nutrition.calories,
          sugar_g: nutrition.totalSugar_g,
          carbs_g: nutrition.totalCarbs_g,
          protein_g: nutrition.protein_g,
          fat_g: nutrition.fat_g,
          fiber_g: nutrition.fiber_g,
          glycemicIndex: nutrition.glycemicIndex,
          note: p.brands ?? "",
        }],
      };
    }),

  exportCsv: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", ctx.userId)
      .order("logged_at", { ascending: false });
    if (error) internalError("food.exportCsv", error);

    // Escape every field; neutralize spreadsheet formula injection (=, +, -, @)
    const escapeCsv = (val: unknown) => {
      let s = String(val ?? "");
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = (data || []).map((r: any) => [
      r.logged_at ?? "",
      r.meal_name,
      r.calories,
      r.total_carbs,
      r.total_sugar,
      r.protein,
      r.fat,
      r.fiber,
      r.glycemic_index,
      r.rating_type2,
    ].map(escapeCsv).join(","));

    const header = "Date,Meal,Calories,Carbs(g),Sugar(g),Protein(g),Fat(g),Fiber(g),GI,Rating";
    return [header, ...rows].join("\n");
  }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      mealName: z.string().optional(),
      calories: z.number().optional(),
      totalSugar: z.number().optional(),
      totalCarbs: z.number().optional(),
      glycemicIndex: z.number().optional(),
      glycemicLoad: z.number().optional(),
      protein: z.number().optional(),
      fat: z.number().optional(),
      fiber: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const row: Record<string, any> = {};
      if (updates.mealName !== undefined) row.meal_name = updates.mealName;
      if (updates.calories !== undefined) row.calories = updates.calories;
      if (updates.totalSugar !== undefined) row.total_sugar = updates.totalSugar;
      if (updates.totalCarbs !== undefined) row.total_carbs = updates.totalCarbs;
      if (updates.glycemicIndex !== undefined) row.glycemic_index = updates.glycemicIndex;
      if (updates.glycemicLoad !== undefined) row.glycemic_load = updates.glycemicLoad;
      if (updates.protein !== undefined) row.protein = updates.protein;
      if (updates.fat !== undefined) row.fat = updates.fat;
      if (updates.fiber !== undefined) row.fiber = updates.fiber;

      if (Object.keys(row).length === 0) return { ok: true };

      const { error } = await supabase
        .from("food_logs")
        .update(row)
        .eq("id", id)
        .eq("user_id", ctx.userId);
      if (error) internalError("food.update", error);
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabase
        .from("food_logs")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.userId);
      if (error) internalError("food.delete", error);
      return { ok: true };
    }),
});
