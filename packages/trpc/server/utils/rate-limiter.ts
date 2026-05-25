import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const inMemoryBuckets = new Map<
  string,
  Map<string, { count: number; resetAt: number }>
>();

let authRatelimit: Ratelimit | null = null;
let mutationRatelimit: Ratelimit | null = null;
let queryRatelimit: Ratelimit | null = null;
let submitRatelimit: Ratelimit | null = null;
let unlockRatelimit: Ratelimit | null = null;

function hasUpstashConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis is not configured");
  }
  return new Redis({ url, token });
}

function getAuthRatelimit(): Ratelimit {
  if (!authRatelimit) {
    authRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "chaiforms:rate:auth",
    });
  }
  return authRatelimit;
}

function getMutationRatelimit(): Ratelimit {
  if (!mutationRatelimit) {
    mutationRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "chaiforms:rate:mutation",
    });
  }
  return mutationRatelimit;
}

function getQueryRatelimit(): Ratelimit {
  if (!queryRatelimit) {
    queryRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(200, "60 s"),
      prefix: "chaiforms:rate:query",
    });
  }
  return queryRatelimit;
}

export function getSubmitRatelimit(): Ratelimit {
  if (!submitRatelimit) {
    submitRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "chaiforms:responses:submit",
      analytics: true,
    });
  }
  return submitRatelimit;
}

export function getUnlockRatelimit(): Ratelimit {
  if (!unlockRatelimit) {
    unlockRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "60 m"),
      prefix: "chaiforms:unlock",
    });
  }
  return unlockRatelimit;
}

function assertInMemoryRateLimit(
  bucketKey: string,
  identifier: string,
  maxRequests: number,
  windowMs = 60_000,
): void {
  const now = Date.now();
  if (!inMemoryBuckets.has(bucketKey)) {
    inMemoryBuckets.set(bucketKey, new Map());
  }
  const buckets = inMemoryBuckets.get(bucketKey)!;
  const bucket = buckets.get(identifier);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`,
    });
  }

  bucket.count += 1;
}

export async function assertRateLimit(
  limiter: Ratelimit,
  identifier: string,
  opts?: {
    formatMessage?: (reset: number) => string;
  },
): Promise<void> {
  const { success, reset } = await limiter.limit(identifier);

  if (!success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((reset - Date.now()) / 1000),
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        opts?.formatMessage?.(reset) ??
        `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`,
    });
  }
}

export async function assertAuthRateLimit(identifier: string): Promise<void> {
  if (!hasUpstashConfig()) {
    assertInMemoryRateLimit("auth", identifier, 10);
    return;
  }
  await assertRateLimit(getAuthRatelimit(), identifier);
}

export async function assertMutationRateLimit(
  identifier: string,
): Promise<void> {
  if (!hasUpstashConfig()) {
    assertInMemoryRateLimit("mutation", identifier, 60);
    return;
  }
  await assertRateLimit(getMutationRatelimit(), identifier);
}

export async function assertQueryRateLimit(identifier: string): Promise<void> {
  if (!hasUpstashConfig()) {
    assertInMemoryRateLimit("query", identifier, 200);
    return;
  }
  await assertRateLimit(getQueryRatelimit(), identifier);
}

/** @internal Reset in-memory buckets between tests. */
export function resetInMemoryRateLimits(): void {
  inMemoryBuckets.clear();
}
