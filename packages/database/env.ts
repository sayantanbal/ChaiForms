import "./load-env";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().describe("DB URL"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    const details = safeParseResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid database environment (${details}). ` +
        "Copy .env.example to .env at the monorepo root and set DATABASE_URL.",
    );
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);
