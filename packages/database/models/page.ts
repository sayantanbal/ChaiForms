import { pgTable, uuid, varchar, integer, index } from "drizzle-orm/pg-core";
import { formsTable } from "./form";

export const pagesTable = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    order: integer("order").notNull(),
    fieldIds: uuid("field_ids").array().notNull().default([]),
  },
  (t) => [index("pages_form_id_idx").on(t.formId)],
);

export type SelectPage = typeof pagesTable.$inferSelect;
export type InsertPage = typeof pagesTable.$inferInsert;
