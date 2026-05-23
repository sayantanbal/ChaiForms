import { pgTable, uuid, text, index } from "drizzle-orm/pg-core";
import { responsesTable } from "./response";

export const answersTable = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => responsesTable.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id").notNull(),
    value: text("value").notNull(),
  },
  (t) => [
    index("answers_response_id_idx").on(t.responseId),
    index("answers_field_id_idx").on(t.fieldId),
  ],
);

export type SelectAnswer = typeof answersTable.$inferSelect;
export type InsertAnswer = typeof answersTable.$inferInsert;
