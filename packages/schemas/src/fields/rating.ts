import { z } from "zod";
import { baseField } from "./base.js";

export const ratingFieldSchema = baseField.extend({
  type: z.literal("rating"),
  maxRating: z.number().int().min(2).max(10),
});

export type RatingField = z.infer<typeof ratingFieldSchema>;
