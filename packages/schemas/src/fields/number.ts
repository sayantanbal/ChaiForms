import { z } from "zod";
import { baseField } from "./base.js";

export const numberFieldSchema = baseField.extend({
  type: z.literal("number"),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
});

export type NumberField = z.infer<typeof numberFieldSchema>;
