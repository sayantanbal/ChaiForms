import { TRPCError } from "@trpc/server";

import {
  assertRateLimit,
  getSubmitRatelimit,
  resetInMemoryRateLimits,
} from "./rate-limiter";

const inMemorySubmitBuckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

function hasUpstashConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function assertInMemorySubmitRateLimit(identifier: string): void {
  const now = Date.now();
  const bucket = inMemorySubmitBuckets.get(identifier);

  if (!bucket || now >= bucket.resetAt) {
    inMemorySubmitBuckets.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return;
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many submissions. Retry after ${retryAfterSeconds} seconds.`,
    });
  }

  bucket.count += 1;
}

/**
 * Rate limit by IP + device fingerprint so multiple devices on the same IP are tracked separately.
 * Uses Upstash Redis when configured; otherwise falls back to an in-process limiter (10 req / 60s).
 */
export async function assertSubmitRateLimit(identifier: string): Promise<void> {
  if (!hasUpstashConfig()) {
    assertInMemorySubmitRateLimit(identifier);
    return;
  }

  try {
    await assertRateLimit(getSubmitRatelimit(), identifier);
  } catch (err) {
    if (err instanceof TRPCError && err.code === "TOO_MANY_REQUESTS") {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: err.message.replace(
          "Rate limit exceeded",
          "Too many submissions",
        ),
      });
    }
    throw err;
  }
}

/** @internal Reset in-memory buckets between tests. */
export function resetInMemorySubmitRateLimit(): void {
  inMemorySubmitBuckets.clear();
  resetInMemoryRateLimits();
}
