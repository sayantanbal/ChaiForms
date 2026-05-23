import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
