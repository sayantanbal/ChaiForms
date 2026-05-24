import { FieldSchemaUnion } from "@repo/schemas";

type RuleOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "greater_than_equal"
  | "less_than_equal"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "in"
  | "not_in";

type SingleRule = {
  field: string;
  operator: RuleOperator;
  value?: any;
};

type RuleGroup = {
  combinator: "AND" | "OR";
  rules: (SingleRule | RuleGroup)[];
};

function normalizeValue(val: any): string | number | boolean | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // Attempt to parse string to number for numeric operators later, but keep as string here
    return val;
  }
  return String(val);
}

function evaluateSingleRule(rule: SingleRule, answers: Record<string, any>): boolean {
  const sourceValueRaw = answers[rule.field];

  switch (rule.operator) {
    case "is_empty":
      if (sourceValueRaw === undefined || sourceValueRaw === null) return true;
      if (typeof sourceValueRaw === "string" && sourceValueRaw.trim() === "") return true;
      if (Array.isArray(sourceValueRaw) && sourceValueRaw.length === 0) return true;
      return false;

    case "is_not_empty":
      if (sourceValueRaw === undefined || sourceValueRaw === null) return false;
      if (typeof sourceValueRaw === "string" && sourceValueRaw.trim() === "") return false;
      if (Array.isArray(sourceValueRaw) && sourceValueRaw.length === 0) return false;
      return true;

    case "equals":
      if (Array.isArray(sourceValueRaw)) {
        return sourceValueRaw.includes(rule.value);
      }
      return String(sourceValueRaw) === String(rule.value);

    case "not_equals":
      if (Array.isArray(sourceValueRaw)) {
        return !sourceValueRaw.includes(rule.value);
      }
      return String(sourceValueRaw) !== String(rule.value);

    case "contains":
      if (sourceValueRaw === undefined || sourceValueRaw === null) return false;
      if (Array.isArray(sourceValueRaw)) {
        return sourceValueRaw.some((v) => String(v).includes(String(rule.value)));
      }
      return String(sourceValueRaw).includes(String(rule.value));

    case "not_contains":
      if (sourceValueRaw === undefined || sourceValueRaw === null) return false;
      if (Array.isArray(sourceValueRaw)) {
        return !sourceValueRaw.some((v) => String(v).includes(String(rule.value)));
      }
      return !String(sourceValueRaw).includes(String(rule.value));

    case "starts_with":
      if (sourceValueRaw === undefined || sourceValueRaw === null) return false;
      return String(sourceValueRaw).startsWith(String(rule.value));

    case "ends_with":
      if (sourceValueRaw === undefined || sourceValueRaw === null) return false;
      return String(sourceValueRaw).endsWith(String(rule.value));

    case "in":
      if (!Array.isArray(rule.value)) return false;
      if (Array.isArray(sourceValueRaw)) {
        return sourceValueRaw.some((v) => rule.value.includes(v));
      }
      return rule.value.includes(sourceValueRaw);

    case "not_in":
      if (!Array.isArray(rule.value)) return false;
      if (Array.isArray(sourceValueRaw)) {
        return !sourceValueRaw.some((v) => rule.value.includes(v));
      }
      return !rule.value.includes(sourceValueRaw);

    case "greater_than":
    case "less_than":
    case "greater_than_equal":
    case "less_than_equal": {
      const sourceNum = Number(sourceValueRaw);
      const ruleNum = Number(rule.value);
      if (isNaN(sourceNum) || isNaN(ruleNum)) return false; // Never throw

      if (rule.operator === "greater_than") return sourceNum > ruleNum;
      if (rule.operator === "less_than") return sourceNum < ruleNum;
      if (rule.operator === "greater_than_equal") return sourceNum >= ruleNum;
      if (rule.operator === "less_than_equal") return sourceNum <= ruleNum;
      return false;
    }

    default:
      return false;
  }
}

export function evaluateRuleGroup(group: RuleGroup, answers: Record<string, any>): boolean {
  if (!group || !group.rules || group.rules.length === 0) return true;

  const evaluateNode = (node: SingleRule | RuleGroup): boolean => {
    if ("combinator" in node) {
      return evaluateRuleGroup(node, answers);
    }
    return evaluateSingleRule(node, answers);
  };

  if (group.combinator === "OR") {
    return group.rules.some(evaluateNode);
  } else {
    // Default to AND
    return group.rules.every(evaluateNode);
  }
}

export function evaluateConditionalRules(
  field: FieldSchemaUnion,
  answers: Record<string, any>
): boolean {
  const rules = field.conditionalRules;
  if (!rules) return true;

  // Legacy flat array support
  if (Array.isArray(rules)) {
    if (rules.length === 0) return true;
    return rules.every((rule: any) =>
      evaluateSingleRule(
        { field: rule.sourceFieldId, operator: rule.operator, value: rule.value },
        answers
      )
    );
  }

  // Recursive rule group support
  return evaluateRuleGroup(rules as any, answers);
}

export function getVisibleFields(
  fields: FieldSchemaUnion[],
  answers: Record<string, any>
): FieldSchemaUnion[] {
  return fields.filter((field) => evaluateConditionalRules(field, answers));
}

// -------------------------------------------------------------------------
// Dynamic Option Evaluation
// -------------------------------------------------------------------------
export type OptionItem = { id: string; label: string; value: string; metadata?: Record<string, any> };
export type OptionInput = string | OptionItem;

export function evaluateDynamicOptions(
  field: FieldSchemaUnion,
  answers: Record<string, any>
): OptionInput[] {
  // @ts-expect-error field.options exists on select types
  const baseOptions: OptionInput[] = field.options || [];
  
  if (!field.dynamicOptionRules || field.dynamicOptionRules.length === 0) {
    return baseOptions;
  }

  // Sort rules by priority (highest first)
  const sortedRules = [...field.dynamicOptionRules].sort((a, b) => {
    return (b.priority || 0) - (a.priority || 0);
  });

  let currentOptions: OptionInput[] = [...baseOptions];
  let replaced = false;

  for (const rule of sortedRules) {
    const isMatch = evaluateRuleGroup(rule.ruleGroup as any, answers);
    if (!isMatch) continue;

    if (rule.mode === "replace" && !replaced) {
      currentOptions = rule.options || [];
      replaced = true;
    } else if (rule.mode === "append") {
      currentOptions = [...currentOptions, ...(rule.options || [])];
    } else if (rule.mode === "filter") {
      const allowedVals = rule.allowedOptions || [];
      currentOptions = currentOptions.filter((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        return allowedVals.includes(val);
      });
    }
  }

  // Deduplicate by value
  const seen = new Set<string>();
  const finalOptions: OptionInput[] = [];
  for (const opt of currentOptions) {
    const val = typeof opt === "string" ? opt : opt.value;
    if (!seen.has(val)) {
      seen.add(val);
      finalOptions.push(opt);
    }
  }

  return finalOptions;
}
