import {
  pgTable,
  uuid,
  timestamp,
  text,
  index,
  varchar,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { formsTable } from "./form";

export const responsesTable = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").notNull(),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    respondentEmail: text("respondent_email"),
    unlockToken: text("unlock_token"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    deviceFingerprint: varchar("device_fingerprint", { length: 64 }),
    deviceType: varchar("device_type", { length: 32 }),
    osName: varchar("os_name", { length: 80 }),
    osVersion: varchar("os_version", { length: 40 }),
    browserName: varchar("browser_name", { length: 80 }),
    browserVersion: varchar("browser_version", { length: 40 }),
    deviceVendor: varchar("device_vendor", { length: 80 }),
    deviceModel: varchar("device_model", { length: 120 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    geoCountry: varchar("geo_country", { length: 80 }),
    geoRegion: varchar("geo_region", { length: 80 }),
    geoCity: varchar("geo_city", { length: 120 }),
  },
  (t) => [
    index("responses_form_id_idx").on(t.formId),
    index("responses_submitted_at_idx").on(t.submittedAt),
    index("responses_device_fingerprint_idx").on(t.deviceFingerprint),
  ],
);

export type SelectResponse = typeof responsesTable.$inferSelect;
export type InsertResponse = typeof responsesTable.$inferInsert;
