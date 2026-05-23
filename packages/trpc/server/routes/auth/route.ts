import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db, eq } from "@repo/database";
import { usersTable } from "@repo/database/schema";
import {
  getNeonAuthProfileBySessionToken,
  syncUserFromNeonAuth,
  extractSessionToken,
} from "@repo/services/auth/neon-session";

import { zodUndefinedModel } from "../../schema";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { signJwt } from "../../utils/jwt";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");
const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionCookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  };
}

const userOutputSchema = z.object({
  id: z.uuid(),
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
        process.env.WEB_ORIGIN ?? process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "http://localhost:3000";
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

      let tokenResult: { tokens: { id_token?: string | null } };
      try {
        tokenResult = (await client.getToken(input.code)) as {
          tokens: { id_token?: string | null };
        };
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

      const token = signJwt(user.id);
      const isProd = process.env.NODE_ENV === "production";
      ctx.res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(isProd));

      return { user: mapUser(user) };
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
      ctx.res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
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

      const token = signJwt(user.id);
      const isProd = process.env.NODE_ENV === "production";
      ctx.res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(isProd));

      return { user: mapUser(user) };
    }),
});
