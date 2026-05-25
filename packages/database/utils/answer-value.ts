import type { FieldSchemaUnion } from "@repo/schemas";
import type { InsertAnswerV2 } from "../models/answer-v2";

type AnswerInput = { fieldId: string; value: string };

/** Map a submitted string answer + field type to typed answers_v2 columns. */
export function buildTypedAnswerRow(
  responseId: string,
  field: FieldSchemaUnion | undefined,
  answer: AnswerInput,
): Omit<InsertAnswerV2, "id" | "createdAt"> {
  const base = {
    responseId,
    fieldId: answer.fieldId,
    valueText: null as string | null,
    valueNumber: null as number | null,
    valueDate: null as Date | null,
    valueBoolean: null as boolean | null,
    valueJson: null as unknown,
  };

  const value = answer.value;
  const type = field?.type;

  switch (type) {
    case "number":
    case "rating": {
      const num = Number(value);
      return { ...base, valueNumber: Number.isFinite(num) ? num : null, valueText: value };
    }
    case "date": {
      const date = new Date(value);
      return {
        ...base,
        valueDate: Number.isNaN(date.getTime()) ? null : date,
        valueText: value,
      };
    }
    case "checkbox":
      return {
        ...base,
        valueBoolean: value === "true",
        valueText: value,
      };
    case "multi_select": {
      try {
        return { ...base, valueJson: JSON.parse(value) as unknown, valueText: value };
      } catch {
        return { ...base, valueText: value };
      }
    }
    default:
      return { ...base, valueText: value };
  }
}

/** Serialize answers_v2 row to the legacy string value used by the API. */
export function answerV2ToDisplayValue(row: {
  valueText: string | null;
  valueNumber: number | null;
  valueDate: Date | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
}): string {
  if (row.valueText !== null && row.valueText !== "") return row.valueText;
  if (row.valueNumber !== null) return String(row.valueNumber);
  if (row.valueBoolean !== null) return String(row.valueBoolean);
  if (row.valueDate !== null) return row.valueDate.toISOString();
  if (row.valueJson !== null) {
    return typeof row.valueJson === "string" ? row.valueJson : JSON.stringify(row.valueJson);
  }
  return "";
}

/** Infer typed columns when migrating legacy text-only answers. */
export function legacyValueToTypedColumns(
  value: string,
): Omit<InsertAnswerV2, "id" | "responseId" | "fieldId" | "createdAt"> {
  const empty = {
    valueText: null as string | null,
    valueNumber: null as number | null,
    valueDate: null as Date | null,
    valueBoolean: null as boolean | null,
    valueJson: null as unknown,
  };

  const trimmed = value.trim();
  if (trimmed === "") return empty;

  if (trimmed === "true" || trimmed === "false") {
    return { ...empty, valueBoolean: trimmed === "true", valueText: trimmed };
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return { ...empty, valueJson: JSON.parse(trimmed) as unknown, valueText: trimmed };
    } catch {
      return { ...empty, valueText: trimmed };
    }
  }

  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== "") {
    return { ...empty, valueNumber: num };
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return { ...empty, valueDate: new Date(parsed) };
  }

  return { ...empty, valueText: trimmed };
}
