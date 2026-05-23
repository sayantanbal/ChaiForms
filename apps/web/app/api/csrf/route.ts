import { NextResponse } from "next/server";
import { createCsrfToken, CSRF_COOKIE_NAME, csrfCookieOptions } from "@repo/trpc/server";

export async function GET() {
  const token = createCsrfToken();
  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE_NAME, token, csrfCookieOptions(isProd));
  return response;
}
