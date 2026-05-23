import { z } from "zod";
import { clientContextSchema } from "./client-context.js";

export const answerSchema = z.object({
  fieldId: z.uuid(),
  value: z.string(),
});

export const submitResponseSchema = z.object({
  formId: z.uuid(),
  startedAt: z.iso.datetime(),
  answers: z.array(answerSchema),
  unlockToken: z.string().optional(),
  clientContext: clientContextSchema.optional(),
});

export type AnswerSchema = z.infer<typeof answerSchema>;
export type SubmitResponseSchema = z.infer<typeof submitResponseSchema>;
