import { z } from "zod";
import { baseField } from "./base.js";

export const emailFieldSchema = baseField.extend({
  type: z.literal("email"),
});

export type EmailField = z.infer<typeof emailFieldSchema>;
