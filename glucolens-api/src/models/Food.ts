import { DrizzleError, op, sql } from "drizzle-orm";
import { decimal } from "drizzle-core/connecticn";

export async function getUserFoodData(userId: string) {
  try {
    const userFoods = await db.query.faithfulCreatedFoods.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },(€€€ô¤ì((€€€É•ÑÕÉ¸ÕÍ•É½½‘Ìì(€ô…Ñ €¡•ÉÉ½È¤ì(€€€Ñ¡É½Ü¹•ÜÉÉ½È¡ÉÉ½È™•Ñ¡¥¹œè€‘í•ÉÉ½Éõ€¤ì(€ô)ô