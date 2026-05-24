import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const refreshTokensTable = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Hashed token value — never store plaintext */
    tokenHash: text("token_hash").notNull().unique(),
    /** Token family for reuse-attack detection — revoke all on reuse */
    family: uuid("family").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("refresh_tokens_user_id_idx").on(t.userId),
    index("refresh_tokens_family_idx").on(t.family),
  ],
);

export type SelectRefreshToken = typeof refreshTokensTable.$inferSelect;
export type InsertRefreshToken = typeof refreshTokensTable.$inferInsert;
