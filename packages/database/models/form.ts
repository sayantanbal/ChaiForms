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
import { workspacesTable } from "./workspace";
import type { FieldSchemaUnion } from "@repo/schemas";

export const formStatusEnum = pgEnum("form_status", ["draft", "published", "archived"]);

export const formVisibilityEnum = pgEnum("form_visibility", ["public", "unlisted"]);

export const formScopeEnum = pgEnum("form_scope", ["global", "workspace"]);

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

    /**
     * workspaceId: if set, form is workspace-scoped (visible only to members).
     * If null, form is global (visible on Explore when public+published).
     */
    workspaceId: uuid("workspace_id").references(() => workspacesTable.id, {
      onDelete: "set null",
    }),

    /**
     * scope mirrors workspaceId but is an explicit enum for query clarity.
     * "global" = discoverable via Explore (if public+published); "workspace" = workspace-only.
     */
    scope: formScopeEnum("scope").default("global").notNull(),

    /**
     * requiresAuth: if true, respondents must be logged in to submit.
     * For workspace-scoped + requiresAuth: respondent must be a workspace member.
     * For global + requiresAuth: any logged-in ChaiForms user may submit.
     * For anonymous (requiresAuth=false): anyone with the link may submit.
     */
    requiresAuth: boolean("requires_auth").default(false).notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 60 }).notNull(),
    status: formStatusEnum("status").default("draft").notNull(),
    visibility: formVisibilityEnum("visibility").default("unlisted").notNull(),
    theme: formThemeEnum("theme").default("default").notNull(),
    fields: jsonb("fields").$type<FieldSchemaUnion[]>().default([]).notNull(),
    customTheme: jsonb("custom_theme").$type<{
      primaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
      fontFamily?: string;
    }>(),
    thankyouMessage: text("thankyou_message"),
    expiryDate: timestamp("expiry_date"),
    responseLimit: integer("response_limit"),
    accessPasswordHash: text("access_password_hash"),
    sendRespondentConfirmation: boolean("send_respondent_confirmation").default(false).notNull(),

    /** Soft-delete: set on "delete", cleared on "recover". Purged after 7 days by cron. */
    deletedAt: timestamp("deleted_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("forms_slug_unique").on(t.slug),
    index("forms_creator_id_idx").on(t.creatorId),
    index("forms_workspace_id_idx").on(t.workspaceId),
    index("forms_status_visibility_idx").on(t.status, t.visibility),
    index("forms_deleted_at_idx").on(t.deletedAt),
  ],
);

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
