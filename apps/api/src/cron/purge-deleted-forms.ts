import { db, and, isNotNull, lte } from "@repo/database";
import { formsTable } from "@repo/database/schema";
import { logger } from "@repo/logger";

const RECOVERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function purgeExpiredForms(): Promise<number> {
  const cutoff = new Date(Date.now() - RECOVERY_WINDOW_MS);

  const deleted = await db
    .delete(formsTable)
    .where(
      and(isNotNull(formsTable.deletedAt), lte(formsTable.deletedAt, cutoff)),
    )
    .returning({ id: formsTable.id });

  if (deleted.length > 0) {
    logger.info("Purged soft-deleted forms past recovery window", {
      count: deleted.length,
    });
  }

  return deleted.length;
}
