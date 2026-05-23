import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /dashboard and /admin routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const demoSession = req.cookies.get("chaiforms-demo-session")?.value;
    const jwtSecret = process.env.JWT_SECRET;

    if (demoSession && jwtSecret) {
      try {
        await jwtVerify(demoSession, new TextEncoder().encode(jwtSecret));
        // Valid demo session, allow access
        return NextResponse.next();
      } catch (err) {
        console.error("Invalid demo session JWT:", err);
      }
    }

    // Default better-auth protection (if no demo bypass)
    // We fetch the current session from better-auth API
    const authReq = new Request(new URL("/api/auth/get-session", req.url), {
      headers: req.headers,
    });
    
    try {
      const authRes = await fetch(authReq);
      if (!authRes.ok) throw new Error("Not authenticated");
      const { session } = await authRes.json();
      
      if (!session) {
        return NextResponse.redirect(new URL("/auth/sign-in", req.url));
      }
      
      // If going to /admin, check role
      if (pathname.startsWith("/admin") && session.user.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
