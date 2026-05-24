import { z } from "zod";
import { baseField } from "./base.ts";

export const checkboxFieldSchema = baseField.extend({
  type: z.literal("checkbox"),
});

export type CheckboxField = z.infer<typeof checkboxFieldSchema>;
