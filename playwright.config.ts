import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    extraHTTPHeaders: { "x-e2e": "true" },
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        extraHTTPHeaders: { "x-e2e": "true" },
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: "pnpm run dev --filter web",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: path.resolve(__dirname),
    },
    {
      command: "pnpm run dev --filter @repo/api",
      url: "http://localhost:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: path.resolve(__dirname),
    },
  ],
});
