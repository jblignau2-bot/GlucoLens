import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../supabase";

export const reportsRouter = router({
  monthly: protectedProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM").optional(),
    }))
    .query(async ({ ctx, input }) => {
      const month = input.month ?? new Date().toISOString().slice(0, 7);
      const [year, mon] = month.split("-").map(Number);
      const from = `${month}-01`;
      // Exclusive upper bound at the start of the next month covers the whole month
      const nextMonthStart =
        mon === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

      const { data: logs } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", ctx.userId)
        .gte("logged_at", from)
        .lt("logged_at", nextMonthStart);

      const rows = logs ?? [];
      const total = rows.length;
      const safe = rows.filter((r: any) => r.rating_type2 === "safe").length;
      const moderate = rows.filter((r: any) => r.rating_type2 === "moderate").length;
      const risky = rows.filter((r: any) => r.rating_type2 === "risky").length;

      const avgCalories = total
        ? Math.round(rows.reduce((s: number, r: any) => s + (r.calories ?? 0), 0) / total)
        : 0;
      const avgCarbs = total
        ? Math.round(rows.reduce((s: number, r: any) => s + (r.total_carbs ?? 0), 0) / total * 10) / 10
        : 0;
      const avgSugar = total
        ? Math.round(rows.reduce((s: number, r: any) => s + (r.total_sugar ?? 0), 0) / total * 10) / 10
        : 0;

      return {
        month,
        totalMeals: total,
        safeCount: safe,
        moderateCount: moderate,
        riskyCount: risky,
        safePercent: total ? Math.round((safe / total) * 100) : 0,
        avgCaloriesPerMeal: avgCalories,
        avgCarbsPerMeal: avgCarbs,
        avgSugarPerMeal: avgSugar,
      };
    }),
});
