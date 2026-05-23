import { z } from "zod";

/** Optional geo from browser Geolocation API (respondent consent). */
export const clientGeoSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().optional(),
});

export const clientContextSchema = z.object({
  geo: clientGeoSchema.optional(),
});

export type ClientGeoSchema = z.infer<typeof clientGeoSchema>;
export type ClientContextSchema = z.infer<typeof clientContextSchema>;
