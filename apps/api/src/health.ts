import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { env } from "./env";

export type HealthChecks = {
  uptime: number;
  timestamp: number;
  database: "healthy" | "unhealthy" | "unknown";
  redis: "healthy" | "unhealthy" | "not_configured" | "unknown";
};

async function checkDatabase(): Promise<HealthChecks["database"]> {
  try {
    await db.execute(sql`SELECT 1`);
    return "healthy";
  } catch {
    return "unhealthy";
  }
}

async function checkRedis(): Promise<HealthChecks["redis"]> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return "not_configured";

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok ? "healthy" : "unhealthy";
  } catch {
    return "unhealthy";
  }
}

export async function runHealthChecks(): Promise<{
  checks: HealthChecks;
  healthy: boolean;
}> {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  const checks: HealthChecks = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    database,
    redis,
  };

  const healthy = database === "healthy";

  return { checks, healthy };
}
