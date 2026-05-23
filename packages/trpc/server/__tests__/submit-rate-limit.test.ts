import { describe, it, expect, beforeEach } from "vitest";
import {
  assertSubmitRateLimit,
  resetInMemorySubmitRateLimit,
} from "../utils/submit-rate-limit";

describe("assertSubmitRateLimit", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetInMemorySubmitRateLimit();
  });

  // Feature: form-builder-saas — procedure-level submit rate limit (10 req / 60s)
  it("allows 10 submissions and blocks the 11th with TOO_MANY_REQUESTS", async () => {
    const key = "test-ip:device";

    for (let i = 0; i < 10; i++) {
      await expect(assertSubmitRateLimit(key)).resolves.toBeUndefined();
    }

    await expect(assertSubmitRateLimit(key)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });
});
