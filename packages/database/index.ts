import "./load-env";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";

export const db = drizzle(env.DATABASE_URL);
export * from "drizzle-orm";
export * from "./test-utils";
export default db;
