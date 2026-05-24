import { FieldSchemaUnion } from "@repo/schemas";

export function evaluateConditionalRules(
  field: FieldSchemaUnion,
  answers: Record<string, any>
): boolean {
  if (!field.conditionalRules || field.conditionalRules.length === 0) {
    return true; // No rules = always visible
  }

  // ALL rules must pass (AND logic)
  return field.conditionalRules.every((rule) => {
    const sourceValue = answers[rule.sourceFieldId];

    switch (rule.operator) {
      case "is_empty":
        if (sourceValue === undefined || sourceValue === null) return true;
        if (typeof sourceValue === "string" && sourceValue.trim() === "") return true;
        if (Array.isArray(sourceValue) && sourceValue.length === 0) return true;
        return false;

      case "is_not_empty":
        if (sourceValue === undefined || sourceValue === null) return false;
        if (typeof sourceValue === "string" && sourceValue.trim() === "") return false;
        if (Array.isArray(sourceValue) && sourceValue.length === 0) return false;
        return true;

      case "equals":
        // Handle array comparison for multi_select
        if (Array.isArray(sourceValue)) {
          return sourceValue.includes(rule.value);
        }
        return String(sourceValue) === String(rule.value);

      case "not_equals":
        if (Array.isArray(sourceValue)) {
          return !sourceValue.includes(rule.value);
        }
        return String(sourceValue) !== String(rule.value);

      case "contains":
        if (sourceValue === undefined || sourceValue === null) return false;
        if (Array.isArray(sourceValue)) {
          return sourceValue.some(v => String(v).includes(String(rule.value)));
        }
        return String(sourceValue).includes(String(rule.value));

      default:
        return false;
    }
  });
}

export function getVisibleFields(
  fields: FieldSchemaUnion[],
  answers: Record<string, any>
): FieldSchemaUnion[] {
  return fields.filter((field) => evaluateConditionalRules(field, answers));
}
