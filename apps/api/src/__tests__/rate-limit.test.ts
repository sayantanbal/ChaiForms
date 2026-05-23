import { describe, it, expect, beforeEach } from "vitest";
import {
  assertSubmitRateLimit,
  resetInMemorySubmitRateLimit,
} from "../../../../packages/trpc/server/utils/submit-rate-limit";

/**
 * Procedure-level submit rate limit (10 req / 60s per IP+device).
 * Exercised here without booting Express so the limiter stays isolated from DB mocks.
 */
describe("Rate Limiting", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetInMemorySubmitRateLimit();
  });

  it("allows 10 submissions and blocks the 11th with TOO_MANY_REQUESTS", async () => {
    const key = "127.0.0.1:integration-test-device";

    for (let i = 0; i < 10; i++) {
      await expect(assertSubmitRateLimit(key)).resolves.toBeUndefined();
    }

    await expect(assertSubmitRateLimit(key)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});
