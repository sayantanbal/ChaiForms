"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { authClient } from "~/lib/auth/client";

export function isTrpcUnauthorized(error: {
  data?: { code?: string } | null;
  message?: string;
}): boolean {
  if (error.data?.code === "UNAUTHORIZED") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("unauthorized") || msg.includes("not authenticated");
}

/** Returns true when the user has a Neon session. Otherwise redirects to /login. */
export async function redirectToLoginIfNeeded(router: AppRouterInstance): Promise<boolean> {
  const session = await authClient.getSession();
  if (session.data?.session) return true;
  router.push("/login");
  return false;
}

export function redirectToLoginOnTrpcError(
  error: { data?: { code?: string } | null; message?: string },
  router: AppRouterInstance,
): boolean {
  if (!isTrpcUnauthorized(error)) return false;
  router.push("/login");
  return true;
}
