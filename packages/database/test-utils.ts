import { sql } from "drizzle-orm";
import { db } from "./index";

export async function clearDatabase() {
  await db.execute(
    sql`TRUNCATE TABLE "users", "refresh_tokens", "workspaces", "workspace_members", "forms", "pages", "responses", "answers", "answers_v2", "templates" CASCADE;`,
  );
}
