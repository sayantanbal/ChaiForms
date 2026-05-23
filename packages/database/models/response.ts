import { pgTable, uuid, timestamp, text, index } from "drizzle-orm/pg-core";
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
  },
  (t) => [
    index("responses_form_id_idx").on(t.formId),
    index("responses_submitted_at_idx").on(t.submittedAt),
  ],
);

export type SelectResponse = typeof responsesTable.$inferSelect;
export type InsertResponse = typeof responsesTable.$inferInsert;
