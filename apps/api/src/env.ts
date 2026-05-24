import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

const rootEnvPath = resolve(__dirname, "../../../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath, override: false });
}

/** Local dev fallback when .env secrets are missing or too short (not used in production). */
const DEV_SECRET_FALLBACK = "chaiforms-local-development-secret-32b";

function isProductionEnv(nodeEnv: string | undefined): boolean {
  return nodeEnv === "production" || nodeEnv === "prod";
}

/** Treat blank env values as unset (dotenv sets `KEY=` as empty string). */
function optionalString() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().optional(),
  );
}

function optionalUrl() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().url().optional(),
  );
}

/** Optional secret; in non-production, substitutes a dev fallback if unset or too short. */
function optionalSecret(min: number) {
  return z.preprocess((val) => {
    const s = typeof val === "string" ? val.trim() : "";
    if (s.length >= min) return s;
    if (!isProductionEnv(process.env.NODE_ENV)) {
      return DEV_SECRET_FALLBACK;
    }
    return s.length === 0 ? undefined : s;
  }, z.string().min(min).optional());
}

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test", "prod"])
    .default("development")
    .transform((v) => (v === "prod" ? "production" : v)),
  BASE_URL: z.string().default("http://localhost:8000"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: optionalSecret(32),
  CSRF_SECRET: optionalSecret(32),
  NEON_AUTH_COOKIE_SECRET: optionalSecret(32),
  GOOGLE_OAUTH_CLIENT_ID: optionalString(),
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString(),
  GOOGLE_OAUTH_REDIRECT_URI: optionalString(),
  UPSTASH_REDIS_REST_URL: optionalUrl(),
  UPSTASH_REDIS_REST_TOKEN: optionalString(),
  ENABLE_DEMO_LOGIN: z.enum(["true", "false"]).optional(),
  RESEND_API_KEY: optionalString(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    const details = safeParseResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid API environment (${details}). ` +
        "Check .env at the monorepo root (see .env.example).",
    );
  }
  return safeParseResult.data;
}

const parsed = createEnv(process.env);

// tRPC and other packages read these from process.env at runtime.
if (parsed.JWT_SECRET) process.env.JWT_SECRET = parsed.JWT_SECRET;
if (parsed.CSRF_SECRET) process.env.CSRF_SECRET = parsed.CSRF_SECRET;
if (parsed.NEON_AUTH_COOKIE_SECRET) {
  process.env.NEON_AUTH_COOKIE_SECRET = parsed.NEON_AUTH_COOKIE_SECRET;
}

export const env = parsed;
