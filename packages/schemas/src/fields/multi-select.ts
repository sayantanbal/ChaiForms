import { z } from "zod";
import { baseField } from "./base.ts";

export const multiSelectFieldSchema = baseField.extend({
  type: z.literal("multi_select"),
  options: z.array(z.string().min(1)).min(2),
});

export type MultiSelectField = z.infer<typeof multiSelectFieldSchema>;
