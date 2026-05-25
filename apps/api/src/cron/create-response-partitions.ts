import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { logger } from "@repo/logger";

export async function createResponsePartitions() {
  logger.info("Starting response partitions creation job...");

  const now = new Date();

  for (let i = 0; i < 2; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const nextDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");

    const partitionName = `responses_${year}_${month}`;
    const startDateStr = targetDate.toISOString().slice(0, 10);
    const endDateStr = nextDate.toISOString().slice(0, 10);

    try {
      // Check if partition exists
      const result = await db.execute(sql`
        SELECT to_regclass(${partitionName}) as exists;
      `);

      if (!result[0]?.exists) {
        logger.info(
          `Creating partition ${partitionName} for dates ${startDateStr} to ${endDateStr}`,
        );
        await db.execute(
          sql.raw(`
          CREATE TABLE IF NOT EXISTS "${partitionName}" 
          PARTITION OF "responses" 
          FOR VALUES FROM ('${startDateStr}') TO ('${endDateStr}');
        `),
        );
      } else {
        logger.debug(`Partition ${partitionName} already exists`);
      }
    } catch (error) {
      logger.error(`Error creating partition ${partitionName}`, { error });
    }
  }

  logger.info("Finished response partitions creation job.");
}
