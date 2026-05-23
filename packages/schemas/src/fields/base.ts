import { z } from "zod";

export const conditionalRuleSchema = z.object({
  sourceFieldId: z.uuid(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "is_empty",
    "is_not_empty",
  ]),
  value: z.string().optional(),
});

export const baseField = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  conditionalRules: z.array(conditionalRuleSchema).optional(),
});
