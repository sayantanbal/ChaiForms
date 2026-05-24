import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

/** Monorepo root `.env` (packages/database → ../..). */
const rootEnvPath = resolve(__dirname, "../../.env");

if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath, override: false });
} else {
  config();
}
