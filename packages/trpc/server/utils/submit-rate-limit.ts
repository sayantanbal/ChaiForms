import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

let submitRatelimit: Ratelimit | null = null;

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

function hasUpstashConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getSubmitRatelimit(): Ratelimit {
  if (!submitRatelimit) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for rate limiting",
      );
    }
    submitRatelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "60 s"),
      prefix: "chaiforms:responses:submit",
      analytics: true,
    });
  }
  return submitRatelimit;
}

function assertInMemoryRateLimit(identifier: string): void {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(identifier);

  if (!bucket || now >= bucket.resetAt) {
    inMemoryBuckets.set(identifier, {
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
    assertInMemoryRateLimit(identifier);
    return;
  }

  const { success, reset } = await getSubmitRatelimit().limit(identifier);

  if (!success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((reset - Date.now()) / 1000),
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many submissions. Retry after ${retryAfterSeconds} seconds.`,
    });
  }
}

/** @internal Reset in-memory buckets between tests. */
export function resetInMemorySubmitRateLimit(): void {
  inMemoryBuckets.clear();
}
