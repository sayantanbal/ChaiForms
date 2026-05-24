import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE_NAME = "chaiforms-access";

type AccessPayload = {
  sub?: string;
  role?: "creator" | "admin";
};

async function verifyAccessCookie(
  token: string,
): Promise<AccessPayload | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload as AccessPayload;
  } catch {
    return null;
  }
}

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

async function getAuthState(req: NextRequest): Promise<{
  authed: boolean;
  role?: "creator" | "admin";
}> {
  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const payload = await verifyAccessCookie(accessToken);
    if (payload?.sub) {
      return { authed: true, role: payload.role ?? "creator" };
    }
  }

  const demoToken = req.cookies.get("chaiforms-demo-session")?.value;
  if (demoToken) {
    const payload = await verifyAccessCookie(demoToken);
    if (payload?.sub) {
      return { authed: true, role: payload.role ?? "creator" };
    }
  }

  const sessionToken = req.cookies.get("session")?.value;
  if (sessionToken && (await verifySessionCookie(sessionToken))) {
    return { authed: true };
  }

  if (await hasNeonAuthSession(req)) {
    return { authed: true };
  }

  return { authed: false };
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { authed, role } = await getAuthState(req);

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) &&
    !authed
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && authed && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname === "/login" && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
