import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const workspacesTable = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [index("workspaces_owner_id_idx").on(t.ownerId)],
);

export type SelectWorkspace = typeof workspacesTable.$inferSelect;
export type InsertWorkspace = typeof workspacesTable.$inferInsert;
