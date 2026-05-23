import { z } from "zod";

export const analyticsSummarySchema = z.object({
  totalResponses: z.number().int(),
  completionRate: z.number().min(0).max(100),
  avgDurationSeconds: z.number().nullable(),
});

export const fieldBreakdownItemSchema = z.object({
  fieldId: z.uuid(),
  fieldLabel: z.string(),
  responseCount: z.number().int(),
  distribution: z.record(z.string(), z.number().int()),
});

export type AnalyticsSummarySchema = z.infer<typeof analyticsSummarySchema>;
export type FieldBreakdownItemSchema = z.infer<typeof fieldBreakdownItemSchema>;
