import { z } from "zod";
import { baseField } from "./base.js";

export const longTextFieldSchema = baseField.extend({
  type: z.literal("long_text"),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
});

export type LongTextField = z.infer<typeof longTextFieldSchema>;
