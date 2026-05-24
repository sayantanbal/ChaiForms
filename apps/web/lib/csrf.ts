import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@repo/trpc/shared/csrf";

let cachedToken: string | null = null;

export function getCsrfTokenFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Fetch CSRF token from Next.js route (sets cookie on web origin). */
export async function ensureCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const fromCookie = getCsrfTokenFromDocumentCookie();
  if (fromCookie) {
    cachedToken = fromCookie;
    return fromCookie;
  }

  const res = await fetch("/api/csrf", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const data = (await res.json()) as { token: string };
  cachedToken = data.token;
  return data.token;
}

export async function getTrpcHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  const csrf = await ensureCsrfToken();
  headers[CSRF_HEADER_NAME] = csrf;

  const { authClient } = await import("~/lib/auth/client");
  const session = await authClient.getSession();
  const token = session.data?.session?.token;
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}
