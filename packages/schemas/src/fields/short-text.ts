import { z } from "zod";
import { baseField } from "./base.js";

export const shortTextFieldSchema = baseField.extend({
  type: z.literal("short_text"),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  validationRegex: z.string().optional(),
});

export type ShortTextField = z.infer<typeof shortTextFieldSchema>;
