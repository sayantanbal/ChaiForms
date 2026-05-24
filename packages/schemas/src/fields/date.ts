import { z } from "zod";
import { baseField } from "./base.ts";

export const dateFieldSchema = baseField.extend({
  type: z.literal("date"),
  minDate: z.iso.datetime().optional(),
  maxDate: z.iso.datetime().optional(),
});

export type DateField = z.infer<typeof dateFieldSchema>;
