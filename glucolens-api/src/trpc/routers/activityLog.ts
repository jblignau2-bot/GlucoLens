import { publicProcedure, router } from "../trpc";

export const activityLogRouter = router({
  getHistory: publicProcedure.query(async () => {
    try {
      const user = await context.user();
      if (!user) throw new Error("Not authenticated");

      const logs = await db.query.activityLog.findMany({}); 
      return logs;
    } catch (e) {
      throw new Error(`Error fetching logs: ${e}`);
    }
  }),
});
