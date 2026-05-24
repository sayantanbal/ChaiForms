import { z } from "zod";
import { baseField } from "./base.ts";

export const singleSelectFieldSchema = baseField.extend({
  type: z.literal("single_select"),
  options: z.array(z.string().min(1)).min(2),
});

export type SingleSelectField = z.infer<typeof singleSelectFieldSchema>;
