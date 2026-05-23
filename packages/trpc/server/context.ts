import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { db, eq } from "@repo/database";
import { usersTable, type SelectUser } from "@repo/database/schema";
import {
  extractSessionToken,
  getNeonAuthProfileBySessionToken,
  syncUserFromNeonAuth,
} from "@repo/services/auth/neon-session";
import { verifyJwt } from "./utils/jwt";

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions) {
  let user: SelectUser | null = null;

  const sessionToken = extractSessionToken({
    headers: req.headers,
    cookies: req.cookies as Record<string, string | undefined>,
  });

  if (sessionToken) {
    try {
      const profile = await getNeonAuthProfileBySessionToken(sessionToken);
      if (profile) {
        user = await syncUserFromNeonAuth(profile);
      }
    } catch {
      user = null;
    }
  }

  if (!user) {
    const demoCookie = (req.cookies as Record<string, string | undefined>)?.[
      "chaiforms-demo-session"
    ];
    if (demoCookie) {
      try {
        const { sub } = verifyJwt(demoCookie);
        const [found] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, sub))
          .limit(1);
        user = found ?? null;
      } catch {
        user = null;
      }
    }
  }

  return { user, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
