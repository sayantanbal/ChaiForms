import { createNeonAuth } from "@neondatabase/auth/next/server";

const DEV_AUTH_BASE_URL = "http://localhost:3000";
const DEV_AUTH_COOKIE_SECRET = "chaiforms-dev-auth-cookie-secret-chaiforms-dev-auth-cookie-secret";

function getAuthBaseUrl(): string {
  return process.env.NEON_AUTH_BASE_URL ?? DEV_AUTH_BASE_URL;
}

function getAuthCookieSecret(): string {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_AUTH_COOKIE_SECRET;
  }

  throw new Error(
    "Missing required config: cookies.secret. You must provide the cookie secret in the config object.",
  );
}

export const auth = createNeonAuth({
  baseUrl: getAuthBaseUrl(),
  cookies: {
    secret: getAuthCookieSecret(),
  },
});
