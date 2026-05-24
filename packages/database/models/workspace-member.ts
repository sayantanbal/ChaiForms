import {
  pgTable,
  uuid,
  pgEnum,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspace";
import { usersTable } from "./user";

/**
 * Workspace-level roles are independent of global user roles.
 * - admin:   can add/remove members, manage all forms in workspace
 * - creator: can create and manage their own forms inside workspace
 * - viewer:  read-only access to workspace forms and their responses/analytics
 */
export const workspaceRoleEnum = pgEnum("workspace_role", [
  "admin",
  "creator",
  "viewer",
]);

export const workspaceMembersTable = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull(),
    invitedAt: timestamp("invited_at").defaultNow(),
    acceptedAt: timestamp("accepted_at"),
  },
  (t) => [
    uniqueIndex("workspace_members_unique").on(t.workspaceId, t.userId),
    index("workspace_members_workspace_id_idx").on(t.workspaceId),
    index("workspace_members_user_id_idx").on(t.userId),
  ],
);

export type SelectWorkspaceMember = typeof workspaceMembersTable.$inferSelect;
export type InsertWorkspaceMember = typeof workspaceMembersTable.$inferInsert;
