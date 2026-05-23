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

export const authRouter = router({
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
      ctx.res.cookie("chaiforms-demo-session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return { user: mapUser(user) };
    }),
});
