import { db, sql } from "@repo/database";
import { usersTable } from "@repo/database/schema";
import { eq } from "@repo/database";
import type { SelectUser } from "@repo/database/schema";

export type NeonAuthProfile = {
  neonAuthUserId: string;
  email: string;
  fullName: string;
  profileImageUrl: string | null;
  emailVerified: boolean;
};

type NeonSessionRow = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
};

/**
 * Resolves a Neon Auth session token (Better Auth) from the `neon_auth` schema.
 */
export async function getNeonAuthProfileBySessionToken(
  sessionToken: string,
): Promise<NeonAuthProfile | null> {
  const result = await db.execute<NeonSessionRow>(sql`
    SELECT
      s."userId" AS "userId",
      u.email AS email,
      u.name AS name,
      u.image AS image,
      COALESCE(u."emailVerified", false) AS "emailVerified"
    FROM neon_auth.session s
    INNER JOIN neon_auth."user" u ON u.id = s."userId"
    WHERE s.token = ${sessionToken}
      AND s."expiresAt" > NOW()
    LIMIT 1
  `);

  const row = result.rows[0];
  if (!row) return null;

  return {
    neonAuthUserId: row.userId,
    email: row.email,
    fullName: row.name ?? row.email,
    profileImageUrl: row.image,
    emailVerified: row.emailVerified,
  };
}

/** Upserts ChaiForms `users` row from Neon Auth profile. */
export async function syncUserFromNeonAuth(
  profile: NeonAuthProfile,
): Promise<SelectUser> {
  const [byNeonId] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.neonAuthUserId, profile.neonAuthUserId))
    .limit(1);

  if (byNeonId) {
    const [updated] = await db
      .update(usersTable)
      .set({
        fullName: profile.fullName,
        email: profile.email,
        profileImageUrl: profile.profileImageUrl,
        emailVerified: profile.emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, byNeonId.id))
      .returning();
    return updated!;
  }

  const [byEmail] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, profile.email))
    .limit(1);

  if (byEmail) {
    const [updated] = await db
      .update(usersTable)
      .set({
        neonAuthUserId: profile.neonAuthUserId,
        fullName: profile.fullName,
        profileImageUrl: profile.profileImageUrl,
        emailVerified: profile.emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, byEmail.id))
      .returning();
    return updated!;
  }

  const [inserted] = await db
    .insert(usersTable)
    .values({
      neonAuthUserId: profile.neonAuthUserId,
      email: profile.email,
      fullName: profile.fullName,
      profileImageUrl: profile.profileImageUrl,
      emailVerified: profile.emailVerified,
      role: "creator",
    })
    .returning();

  return inserted!;
}

export function extractSessionToken(req: {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
}): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || null;
  }

  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === "string") {
    const match = cookieHeader.match(
      /(?:^|;\s*)better-auth\.session_token=([^;]+)/,
    );
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  const sessionCookie =
    req.cookies?.["better-auth.session_token"] ??
    req.cookies?.["__Secure-better-auth.session_token"];
  if (sessionCookie) return sessionCookie;

  return null;
}
