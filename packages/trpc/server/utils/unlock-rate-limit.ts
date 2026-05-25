import { TRPCError } from "@trpc/server";

import {
  assertRateLimit,
  getUnlockRatelimit,
  resetInMemoryRateLimits,
} from "./rate-limiter";

const inMemoryUnlockBuckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

function hasUpstashConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function assertInMemoryUnlockRateLimit(identifier: string): void {
  const now = Date.now();
  const bucket = inMemoryUnlockBuckets.get(identifier);

  if (!bucket || now >= bucket.resetAt) {
    inMemoryUnlockBuckets.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return;
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterMinutes = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 60000),
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many unlock attempts. Try again in ${retryAfterMinutes} minutes.`,
    });
  }

  bucket.count += 1;
}

/** Rate limit unlock attempts by IP + form slug (5 per hour). */
export async function assertUnlockRateLimit(identifier: string): Promise<void> {
  if (!hasUpstashConfig()) {
    assertInMemoryUnlockRateLimit(identifier);
    return;
  }

  await assertRateLimit(getUnlockRatelimit(), identifier, {
    formatMessage: (reset) => {
      const retryAfterMinutes = Math.max(
        1,
        Math.ceil((reset - Date.now()) / 60000),
      );
      return `Too many unlock attempts. Try again in ${retryAfterMinutes} minutes.`;
    },
  });
}

/** @internal Reset in-memory buckets between tests. */
export function resetInMemoryUnlockRateLimit(): void {
  inMemoryUnlockBuckets.clear();
  resetInMemoryRateLimits();
}
