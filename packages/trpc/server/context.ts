import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { db, eq } from "@repo/database";
import { usersTable, type SelectUser } from "@repo/database/schema";
import {
  extractSessionToken,
  getNeonAuthProfileBySessionToken,
  syncUserFromNeonAuth,
} from "@repo/services/auth/neon-session";
import { verifyAccessJwt } from "./utils/jwt";

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions) {
  let user: SelectUser | null = null;

  // 1. Try access JWT (primary path)
  const accessCookie = (req.cookies as Record<string, string | undefined>)?.[
    "chaiforms-access"
  ];
  
  if (accessCookie) {
    try {
      const { sub } = verifyAccessJwt(accessCookie);
      const [found] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, sub))
        .limit(1);
      if (found && !found.isBlocked) {
        user = found;
      }
    } catch {
      /* expired or invalid */
    }
  }

  // 2. Fallback: Neon Auth session
  if (!user) {
    const sessionToken = extractSessionToken({
      headers: req.headers,
      cookies: req.cookies as Record<string, string | undefined>,
    });

    if (sessionToken) {
      try {
        const profile = await getNeonAuthProfileBySessionToken(sessionToken);
        if (profile) {
          const syncedUser = await syncUserFromNeonAuth(profile);
          if (!syncedUser.isBlocked) {
            user = syncedUser;
          }
        }
      } catch {
        user = null;
      }
    }
  }

  // 3. Fallback: Demo bypass cookie
  if (!user) {
    const demoCookie = (req.cookies as Record<string, string | undefined>)?.[
      "chaiforms-demo-session"
    ];
    if (demoCookie) {
      try {
        const { sub } = verifyAccessJwt(demoCookie);
        const [found] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, sub))
          .limit(1);
        if (found && !found.isBlocked) {
          user = found;
        }
      } catch {
        user = null;
      }
    }
  }

  return { user, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
