import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "src/__tests__/visibility-enforcement.test.ts",
      "src/__tests__/submit-flow.test.ts",
      "src/__tests__/oauth-callback.test.ts",
    ],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    fileParallelism: false,
    server: {
      deps: {
        inline: ["@repo/trpc", "@repo/database", "@repo/services", "google-auth-library"],
      },
    },
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/chaiforms_test",
      CSRF_SECRET: "c".repeat(32),
      JWT_SECRET: "j".repeat(32),
      BASE_URL: "http://localhost:3000",
    },
  },
});
