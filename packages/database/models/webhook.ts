import { pgTable, text, timestamp, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspace";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import type { WebhookEvent } from "@repo/types";

export const webhooks = pgTable("webhooks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<WebhookEvent[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  workspace: one(workspacesTable, {
    fields: [webhooks.workspaceId],
    references: [workspacesTable.id],
  }),
}));
