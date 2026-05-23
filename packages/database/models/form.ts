import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import type { FieldSchemaUnion } from "@repo/schemas";

export const formStatusEnum = pgEnum("form_status", [
  "draft",
  "published",
  "archived",
]);

export const formVisibilityEnum = pgEnum("form_visibility", [
  "public",
  "unlisted",
]);

export const formThemeEnum = pgEnum("form_theme", [
  "default",
  "anime",
  "movie",
  "game",
  "startup",
  "tech_company",
  "os",
  "event",
]);

export const formsTable = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 60 }).notNull(),
    status: formStatusEnum("status").default("draft").notNull(),
    visibility: formVisibilityEnum("visibility").default("unlisted").notNull(),
    theme: formThemeEnum("theme").default("default").notNull(),
    fields: jsonb("fields").$type<FieldSchemaUnion[]>().default([]).notNull(),
    thankyouMessage: text("thankyou_message"),
    expiryDate: timestamp("expiry_date"),
    responseLimit: integer("response_limit"),
    accessPasswordHash: text("access_password_hash"),
    sendRespondentConfirmation: boolean("send_respondent_confirmation")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("forms_slug_unique").on(t.slug),
    index("forms_creator_id_idx").on(t.creatorId),
    index("forms_status_visibility_idx").on(t.status, t.visibility),
  ],
);

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
