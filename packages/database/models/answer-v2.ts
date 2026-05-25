import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  doublePrecision,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { responsesTable } from "./response";

export const answersV2Table = pgTable(
  "answers_v2",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => responsesTable.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id").notNull(),
    valueText: text("value_text"),
    valueNumber: doublePrecision("value_number"),
    valueDate: timestamp("value_date"),
    valueBoolean: boolean("value_boolean"),
    valueJson: jsonb("value_json").$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("answers_v2_response_id_idx").on(t.responseId),
    index("answers_v2_field_id_idx").on(t.fieldId),
    index("answers_v2_text_idx")
      .on(t.fieldId, t.valueText)
      .where(sql`value_text IS NOT NULL`),
    index("answers_v2_number_idx")
      .on(t.fieldId, t.valueNumber)
      .where(sql`value_number IS NOT NULL`),
    index("answers_v2_date_idx")
      .on(t.fieldId, t.valueDate)
      .where(sql`value_date IS NOT NULL`),
  ],
);

export type SelectAnswerV2 = typeof answersV2Table.$inferSelect;
export type InsertAnswerV2 = typeof answersV2Table.$inferInsert;
