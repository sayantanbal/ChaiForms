import { z } from "zod";

export const ruleOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "greater_than_equal",
  "less_than_equal",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
  "in",
  "not_in",
]);

export const singleRuleSchema = z.object({
  field: z.string(),
  operator: ruleOperatorSchema,
  value: z.any().optional(),
});

export type SingleRuleType = z.infer<typeof singleRuleSchema>;

export type RuleGroupType = {
  combinator: "AND" | "OR";
  rules: (SingleRuleType | RuleGroupType)[];
};

export const ruleGroupSchema: z.ZodType<RuleGroupType> = z.lazy(() =>
  z.object({
    combinator: z.enum(["AND", "OR"]),
    rules: z.array(z.union([singleRuleSchema, ruleGroupSchema])),
  })
);

export const optionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type OptionType = z.infer<typeof optionSchema>;

export const dynamicOptionRuleSchema = z.object({
  id: z.string(),
  mode: z.enum(["append", "replace", "filter"]),
  priority: z.number().optional(),
  ruleGroup: ruleGroupSchema,
  options: z.array(optionSchema).optional(),
  allowedOptions: z.array(z.string()).optional(), // For filter mode by value
});

export type DynamicOptionRuleType = z.infer<typeof dynamicOptionRuleSchema>;

// Export old schema name as alias to avoid breaking index.ts exports until we update them
export const conditionalRuleSchema = singleRuleSchema;

export const baseField = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  conditionalRules: ruleGroupSchema.optional(),
  dynamicOptionRules: z.array(dynamicOptionRuleSchema).optional(),
});
