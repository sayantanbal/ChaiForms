import { z } from "zod";
import { baseField } from "./base.ts";

import { optionSchema } from "./base.ts";

export const multiSelectFieldSchema = baseField.extend({
  type: z.literal("multi_select"),
  options: z.array(z.union([z.string().min(1), optionSchema])).min(2),
});

export type MultiSelectField = z.infer<typeof multiSelectFieldSchema>;
