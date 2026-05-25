import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { alertService } from "@repo/services/alerting";
import { logger } from "@repo/logger";

export function startHealthCheck(intervalMs = 60_000) {
  logger.info("Starting background health checks");
  setInterval(async () => {
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      await alertService.sendAlert({
        severity: "critical",
        title: "Database Connection Failed",
        description: "Unable to connect to PostgreSQL database",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }, intervalMs);
}
