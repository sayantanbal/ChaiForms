import { db, sql } from "@repo/database";
import { logger } from "@repo/logger";

export async function refreshAnalyticsMaterializedViews(): Promise<void> {
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY form_summary_stats`);
  logger.info("Refreshed analytics materialized views");
}
