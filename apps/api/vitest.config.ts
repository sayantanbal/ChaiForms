import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      CSRF_SECRET: "c".repeat(32),
      JWT_SECRET: "j".repeat(32),
      BASE_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
    },
  },
});
