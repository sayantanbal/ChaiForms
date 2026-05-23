import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function verifySessionCookie(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

async function hasNeonAuthSession(req: NextRequest): Promise<boolean> {
  const authReq = new Request(new URL("/api/auth/get-session", req.url), {
    headers: req.headers,
  });

  try {
    const authRes = await fetch(authReq);
    if (!authRes.ok) return false;
    const data = (await authRes.json()) as { session?: unknown };
    return Boolean(data.session);
  } catch {
    return false;
  }
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const sessionToken = req.cookies.get("session")?.value;
  if (sessionToken && (await verifySessionCookie(sessionToken))) {
    return true;
  }

  return hasNeonAuthSession(req);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await isAuthenticated(req);

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) &&
    !authed
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login" && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
