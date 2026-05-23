import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { formThemeEnum } from "./form";
import type { FieldSchemaUnion } from "@repo/schemas";

export const templatesTable = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  theme: formThemeEnum("theme").default("default").notNull(),
  fields: jsonb("fields").$type<FieldSchemaUnion[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectTemplate = typeof templatesTable.$inferSelect;
export type InsertTemplate = typeof templatesTable.$inferInsert;
