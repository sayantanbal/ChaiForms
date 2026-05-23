import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let submitRatelimit: Ratelimit | null = null;

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
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "chaiforms:responses:submit",
      analytics: true,
    });
  }
  return submitRatelimit;
}

/**
 * Rate limit by IP + device fingerprint so multiple devices on the same IP are tracked separately.
 */
export async function assertSubmitRateLimit(identifier: string): Promise<void> {
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
