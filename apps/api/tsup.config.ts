import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: ["@repo"], // transpile packages starting with `@repo` and their dependencies
  external: [
    "jsonwebtoken",
    "bcryptjs",
    "nanoid",
    "@upstash/ratelimit",
    "ua-parser-js",
    "@upstash/redis",
    "google-auth-library",
    "@paralleldrive/cuid2",
    "pino",
    "pino-pretty",
    "zod",
    "drizzle-orm",
  ],
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
