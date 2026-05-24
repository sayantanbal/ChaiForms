import { z } from "zod";
import { baseField } from "./base.ts";

import { optionSchema } from "./base.ts";

export const singleSelectFieldSchema = baseField.extend({
  type: z.literal("single_select"),
  options: z.array(z.union([z.string().min(1), optionSchema])).min(2),
});

export type SingleSelectField = z.infer<typeof singleSelectFieldSchema>;
