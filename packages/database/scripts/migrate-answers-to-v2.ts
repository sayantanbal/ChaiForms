/**
 * One-time migration: copy legacy `answers` rows into typed `answers_v2`.
 * Run: pnpm --filter @repo/database db:migrate-answers-v2
 */
import "../load-env";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { answersTable, answersV2Table } from "../schema";
import { legacyValueToTypedColumns } from "../utils/answer-value";
const BATCH_SIZE = 1000;

async function migrateAnswers() {
  let offset = 0;
  let migrated = 0;

  while (true) {
    const batch = await db.select().from(answersTable).limit(BATCH_SIZE).offset(offset);

    if (batch.length === 0) break;

    const rows = batch.map((answer) => ({
      id: answer.id,
      responseId: answer.responseId,
      fieldId: answer.fieldId,
      ...legacyValueToTypedColumns(answer.value),
    }));

    await db.insert(answersV2Table).values(rows).onConflictDoNothing({ target: answersV2Table.id });

    migrated += batch.length;
    offset += BATCH_SIZE;
    console.log(`Migrated ${migrated} answers...`);
  }

  const [{ count: legacy }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(answersTable);
  const [{ count: v2 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(answersV2Table);

  console.log(`Done. Legacy: ${legacy}, answers_v2: ${v2}`);
}

migrateAnswers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
