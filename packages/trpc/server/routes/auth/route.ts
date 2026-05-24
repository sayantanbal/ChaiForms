import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db, eq } from "@repo/database";
import { usersTable, refreshTokensTable } from "@repo/database/schema";
import {
  getNeonAuthProfileBySessionToken,
  syncUserFromNeonAuth,
  extractSessionToken,
} from "@repo/services/auth/neon-session";

import { zodUndefinedModel } from "../../schema";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  signAccessJwt,
  signRefreshJwt,
  verifyRefreshJwt,
  hashToken,
  generateTokenId,
} from "../../utils/jwt";
import {
  createCsrfToken,
  csrfCookieOptions,
  CSRF_COOKIE_NAME,
} from "../../utils/csrf";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

const ACCESS_COOKIE_NAME = "chaiforms-access";
const REFRESH_COOKIE_NAME = "chaiforms-refresh";

function accessCookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    maxAge: 15 * 60 * 1000, // 15 mins
    path: "/",
  };
}

function refreshCookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/api/trpc/auth", // Ensure path matches tRPC base
  };
}

const userOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum(["creator", "admin"]),
  profileImageUrl: z.string().nullable(),
  emailVerified: z.boolean().nullable(),
});

function mapUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    profileImageUrl: user.profileImageUrl,
    emailVerified: user.emailVerified,
  };
}

export const authRouter: ReturnType<typeof router> = router({
  getSupportedAuthenticationProviders: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/supported-providers"),
        tags: TAGS,
      },
    })
    .input(zodUndefinedModel)
    .output(
      z.readonly(
        z.array(
          z.object({
            provider: z.enum(["NEON_AUTH", "GOOGLE_OAUTH"]),
            displayName: z.string().optional(),
            displayText: z.string().optional(),
            authUrl: z.string(),
          }),
        ),
      ),
    )
    .query(async () => {
      const webOrigin =
        process.env.WEB_ORIGIN ??
        process.env.NEXT_PUBLIC_WEB_BASE_URL ??
        "http://localhost:3000";
      const providers: {
        provider: "NEON_AUTH" | "GOOGLE_OAUTH";
        displayName?: string;
        displayText?: string;
        authUrl: string;
      }[] = [];

      if (process.env.NEON_AUTH_BASE_URL) {
        providers.push({
          provider: "NEON_AUTH",
          displayName: "ChaiForms",
          displayText: "Sign in with email or social",
          authUrl: `${webOrigin}/auth/sign-in`,
        });
      }

      if (
        process.env.GOOGLE_OAUTH_CLIENT_ID &&
        process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
        process.env.GOOGLE_OAUTH_REDIRECT_URI
      ) {
        const { OAuth2Client } = await import("google-auth-library");
        const client = new OAuth2Client({
          client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
          client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
          redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
        });
        providers.push({
          provider: "GOOGLE_OAUTH",
          displayName: "Google",
          displayText: "Sign in with Google (legacy)",
          authUrl: client.generateAuthUrl({
            access_type: "offline",
            scope: ["openid", "email", "profile"],
          }),
        });
      }

      return providers;
    }),

  callback: publicProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/callback"), tags: TAGS },
    })
    .input(
      z.object({
        code: z.string().min(1),
      }),
    )
    .output(z.object({ user: userOutputSchema }))
    .query(async ({ input, ctx }) => {
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Google OAuth is not configured",
        });
      }

      const { OAuth2Client } = await import("google-auth-library");
      const client = new OAuth2Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirectUri,
      });

      let tokenResult;
      try {
        tokenResult = await client.getToken(input.code);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired authorization code",
        });
      }
      const idToken = tokenResult.tokens.id_token ?? undefined;
      if (!idToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Google OAuth did not return an ID token",
        });
      }

      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      const email = payload?.email?.toLowerCase();
      if (!email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Google profile is missing an email address",
        });
      }

      const fullName = payload?.name ?? email;
      const profileImageUrl = payload?.picture ?? null;
      const emailVerified = payload?.email_verified ?? false;

      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      const user = existing
        ? (
            await db
              .update(usersTable)
              .set({
                fullName,
                profileImageUrl,
                emailVerified,
                updatedAt: new Date(),
              })
              .where(eq(usersTable.id, existing.id))
              .returning()
          )[0]
        : (
            await db
              .insert(usersTable)
              .values({
                email,
                fullName,
                profileImageUrl,
                emailVerified,
                role: email === "admin@chaiforms.dev" ? "admin" : "creator",
              })
              .returning()
          )[0];

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to persist user profile",
        });
      }

      if (user.isBlocked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Account blocked",
        });
      }

      const familyId = generateTokenId();
      const refreshPlain = generateTokenId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(refreshTokensTable).values({
        userId: user.id,
        family: familyId,
        tokenHash: hashToken(refreshPlain),
        expiresAt,
      });

      const accessJwt = signAccessJwt(user.id);
      const refreshJwt = signRefreshJwt(user.id, familyId);
      const csrf = createCsrfToken();
      const isProd = process.env.NODE_ENV === "production";

      ctx.res.cookie(ACCESS_COOKIE_NAME, accessJwt, accessCookieOptions(isProd));
      ctx.res.cookie(
        REFRESH_COOKIE_NAME,
        `${refreshPlain}:${refreshJwt}`,
        refreshCookieOptions(isProd),
      );
      ctx.res.cookie(CSRF_COOKIE_NAME, csrf, csrfCookieOptions(isProd));

      return { user: mapUser(user) };
    }),

  refreshToken: publicProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/refresh-token"), tags: TAGS },
    })
    .input(zodUndefinedModel)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      const refreshCookie = (ctx.req.cookies as Record<string, string | undefined>)?.[
        REFRESH_COOKIE_NAME
      ];
      if (!refreshCookie) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const parts = refreshCookie.split(":");
      if (parts.length !== 2) throw new TRPCError({ code: "UNAUTHORIZED" });
      const [plainToken, jwtString] = parts;
      if (!plainToken || !jwtString) throw new TRPCError({ code: "UNAUTHORIZED" });

      let payload;
      try {
        payload = verifyRefreshJwt(jwtString);
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const hashed = hashToken(plainToken);
      const [tokenRow] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.tokenHash, hashed))
        .limit(1);

      if (!tokenRow) {
        // Reuse detected (token not found but JWT is valid for family)
        await db
          .update(refreshTokensTable)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokensTable.family, payload.family));
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token reuse detected",
        });
      }

      if (tokenRow.revokedAt || tokenRow.expiresAt < new Date()) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Invalidate the old token
      await db
        .delete(refreshTokensTable)
        .where(eq(refreshTokensTable.id, tokenRow.id));

      const newFamily = payload.family; // keep same family
      const newRefreshPlain = generateTokenId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(refreshTokensTable).values({
        userId: payload.sub,
        family: newFamily,
        tokenHash: hashToken(newRefreshPlain),
        expiresAt,
      });

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, payload.sub))
        .limit(1);

      if (!user || user.isBlocked) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const accessJwt = signAccessJwt(user.id);
      const newRefreshJwt = signRefreshJwt(user.id, newFamily);
      const csrf = createCsrfToken();
      const isProd = process.env.NODE_ENV === "production";

      ctx.res.cookie(ACCESS_COOKIE_NAME, accessJwt, accessCookieOptions(isProd));
      ctx.res.cookie(
        REFRESH_COOKIE_NAME,
        `${newRefreshPlain}:${newRefreshJwt}`,
        refreshCookieOptions(isProd),
      );
      ctx.res.cookie(CSRF_COOKIE_NAME, csrf, csrfCookieOptions(isProd));

      return { success: true };
    }),

  me: protectedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/me"), tags: TAGS },
    })
    .input(zodUndefinedModel)
    .output(userOutputSchema)
    .query(async ({ ctx }) => mapUser(ctx.user)),

  signOut: protectedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/sign-out"), tags: TAGS },
    })
    .input(zodUndefinedModel)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      const isProd = process.env.NODE_ENV === "production";

      await db
        .delete(refreshTokensTable)
        .where(eq(refreshTokensTable.userId, ctx.user.id));

      ctx.res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
      ctx.res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(isProd));
      ctx.res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
      ctx.res.clearCookie("chaiforms-demo-session", { path: "/" });
      ctx.res.clearCookie("better-auth.session_token", { path: "/" });
      ctx.res.clearCookie("__Secure-better-auth.session_token", { path: "/" });
      return { success: true };
    }),

  syncSession: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/sync-session"),
        tags: TAGS,
        description:
          "Sync Neon Auth session to ChaiForms users table. Call after Neon sign-in with Bearer session token.",
      },
    })
    .input(zodUndefinedModel)
    .output(z.object({ user: userOutputSchema }))
    .mutation(async ({ ctx }) => {
      const token = extractSessionToken({
        headers: ctx.req.headers,
        cookies: ctx.req.cookies as Record<string, string | undefined>,
      });
      if (!token) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const profile = await getNeonAuthProfileBySessionToken(token);
      if (!profile) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid session" });
      }
      const user = await syncUserFromNeonAuth(profile);
      if (user.isBlocked) throw new TRPCError({ code: "FORBIDDEN" });

      return { user: mapUser(user) };
    }),

  demoLogin: publicProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/demo-login"), tags: TAGS },
    })
    .input(
      z.object({
        email: z.enum(["demo@chaiforms.dev", "admin@chaiforms.dev"]),
      }),
    )
    .output(z.object({ user: userOutputSchema }))
    .mutation(async ({ input, ctx }) => {
      if (process.env.ENABLE_DEMO_LOGIN !== "true") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo user not found. Run pnpm db:seed first.",
        });
      }

      if (user.isBlocked) throw new TRPCError({ code: "FORBIDDEN" });

      const familyId = generateTokenId();
      const refreshPlain = generateTokenId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(refreshTokensTable).values({
        userId: user.id,
        family: familyId,
        tokenHash: hashToken(refreshPlain),
        expiresAt,
      });

      const accessJwt = signAccessJwt(user.id);
      const refreshJwt = signRefreshJwt(user.id, familyId);
      const csrf = createCsrfToken();
      const isProd = process.env.NODE_ENV === "production";

      ctx.res.cookie(ACCESS_COOKIE_NAME, accessJwt, accessCookieOptions(isProd));
      ctx.res.cookie(
        REFRESH_COOKIE_NAME,
        `${refreshPlain}:${refreshJwt}`,
        refreshCookieOptions(isProd),
      );
      ctx.res.cookie(CSRF_COOKIE_NAME, csrf, csrfCookieOptions(isProd));

      return { user: mapUser(user) };
    }),
});
