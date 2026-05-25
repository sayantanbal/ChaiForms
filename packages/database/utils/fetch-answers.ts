import { inArray } from "drizzle-orm";
import { db } from "../db";
import { answersTable, answersV2Table } from "../schema";
import { answerV2ToDisplayValue } from "./answer-value";

export type DisplayAnswer = {
  id: string;
  fieldId: string;
  value: string;
};

export async function fetchDisplayAnswersForResponses(
  responseIds: string[],
): Promise<Map<string, DisplayAnswer[]>> {
  const result = new Map<string, DisplayAnswer[]>();
  if (responseIds.length === 0) return result;

  const v2Rows = await db
    .select()
    .from(answersV2Table)
    .where(inArray(answersV2Table.responseId, responseIds));

  const responsesWithV2 = new Set<string>();

  for (const row of v2Rows) {
    responsesWithV2.add(row.responseId);
    if (!result.has(row.responseId)) result.set(row.responseId, []);
    result.get(row.responseId)!.push({
      id: row.id,
      fieldId: row.fieldId,
      value: answerV2ToDisplayValue(row),
    });
  }

  const legacyIds = responseIds.filter((id) => !responsesWithV2.has(id));
  if (legacyIds.length === 0) return result;

  const legacyRows = await db
    .select()
    .from(answersTable)
    .where(inArray(answersTable.responseId, legacyIds));

  for (const row of legacyRows) {
    if (!result.has(row.responseId)) result.set(row.responseId, []);
    result.get(row.responseId)!.push({
      id: row.id,
      fieldId: row.fieldId,
      value: row.value,
    });
  }

  return result;
}

/** Answers for a single response (v2 preferred, legacy fallback). */
export async function fetchDisplayAnswersForResponse(responseId: string): Promise<DisplayAnswer[]> {
  const map = await fetchDisplayAnswersForResponses([responseId]);
  return map.get(responseId) ?? [];
}
