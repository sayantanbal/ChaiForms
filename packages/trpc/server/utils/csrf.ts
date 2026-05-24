import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../../shared/csrf";
export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };

const DEV_CSRF_SECRET = "chaiforms-dev-csrf-secret-chaiforms-dev-csrf-secret";

function getCsrfSecret(): string {
  const secret =
    process.env.CSRF_SECRET ?? process.env.JWT_SECRET ?? process.env.NEON_AUTH_COOKIE_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_CSRF_SECRET;
  }

  if (!secret || secret.length < 32) {
    throw new Error(
      "CSRF_SECRET, JWT_SECRET, or NEON_AUTH_COOKIE_SECRET (min 32 chars) is required",
    );
  }
  return secret;
}

export function createCsrfToken(): string {
  const raw = randomBytes(24).toString("hex");
  const signature = createHmac("sha256", getCsrfSecret()).update(raw).digest("hex");
  return `${raw}.${signature}`;
}

function isValidCsrfToken(token: string): boolean {
  const [raw, signature] = token.split(".");
  if (!raw || !signature) return false;
  const expected = createHmac("sha256", getCsrfSecret()).update(raw).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function assertAllowedOrigin(headers: Record<string, string | string[] | undefined>): void {
  const webOriginEnv = process.env.WEB_ORIGIN;
  if (!webOriginEnv) return;

  const configuredOrigins = webOriginEnv.split(",").map((origin) => origin.trim());
  if (configuredOrigins.includes("*")) return;

  const allowedOrigins = new Set(
    configuredOrigins
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin)),
  );
  if (allowedOrigins.size === 0) return;

  const origin = headers.origin;
  const referer = headers.referer;

  if (typeof origin === "string") {
    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) return;
  }

  if (typeof referer === "string") {
    const normalizedReferer = normalizeOrigin(referer);
    if (normalizedReferer && allowedOrigins.has(normalizedReferer)) return;
  }

  if (!origin && !referer) return;

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Origin not allowed",
  });
}

/**
 * CSRF for split deployments (Vercel web + Cloud Run API):
 * - Requires signed `x-csrf-token` on mutations
 * - Validates `Origin` / `Referer` against `WEB_ORIGIN` when present
 * - Double-submit cookie check when `chaiforms-csrf` cookie is sent (same-origin)
 */
export function assertCsrf(req: {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  method?: string;
  csrfToken?: string;
}): void {
  const method = (req.method ?? "GET").toUpperCase();
  const isSafeMethod = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (isSafeMethod && !req.csrfToken) {
    return;
  }

  const headerToken = req.headers[CSRF_HEADER_NAME];
  const token =
    req.csrfToken ??
    (typeof headerToken === "string"
      ? headerToken
      : Array.isArray(headerToken)
        ? headerToken[0]
        : undefined);

  if (!token || !isValidCsrfToken(token)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Invalid or missing CSRF token",
    });
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (cookieToken && cookieToken !== token) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "CSRF cookie mismatch",
    });
  }

  assertAllowedOrigin(req.headers);
}

export function csrfCookieOptions(isProd: boolean) {
  return {
    httpOnly: false, // Must be readable by client JS
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  };
}
