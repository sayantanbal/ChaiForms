import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    fileParallelism: false,
    env: {
      JWT_SECRET: "this-is-a-super-secret-jwt-key-for-testing-123",
      NODE_ENV: "test",
      CSRF_SECRET: "c".repeat(32),
    },
  },
});
