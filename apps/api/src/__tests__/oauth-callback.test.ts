/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration test: OAuth callback flow (Live DB)
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

vi.mock("@repo/trpc/server/utils/jwt", () => ({
  signJwt: vi.fn(() => "mock.jwt.token"),
  verifyJwt: vi.fn(),
  signAccessJwt: vi.fn(() => "mock.access.jwt"),
  signRefreshJwt: vi.fn(() => "mock.refresh.jwt"),
  generateTokenId: vi.fn(() => "123e4567-e89b-12d3-a456-426614174000"),
  hashToken: vi.fn(() => "mock.hashed.token"),
}));

vi.mock("@repo/trpc/server/utils/csrf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/trpc/server/utils/csrf")>();
  return {
    ...actual,
  };
});

import { OAuth2Client } from "google-auth-library";

vi.spyOn(OAuth2Client.prototype, "getToken").mockResolvedValue({
  tokens: { id_token: "mock-id-token" },
} as any);

vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
  getPayload: () => ({
    email: "alice@example.com",
    name: "Alice Example",
    picture: null,
    sub: "google-sub-abc123",
    email_verified: true,
  }),
} as any);

import { authRouter } from "@repo/trpc/server/routes/auth/route";
import { db, clearDatabase, eq } from "@repo/database";
import { usersTable } from "@repo/database/schema";
import { signAccessJwt } from "@repo/trpc/server/utils/jwt";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, createCsrfToken } from "@repo/trpc/server/utils/csrf";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DEMO_USER_ID = "11111111-2222-4333-a444-555555555555";

function buildCtx(withCsrf = true) {
  const token = withCsrf ? createCsrfToken() : null;
  return {
    user: null,
    req: {
      headers: token ? { [CSRF_HEADER_NAME]: token } : {},
      cookies: token ? { [CSRF_COOKIE_NAME]: token } : {},
      method: "POST",
      ip: "127.0.0.1",
    },
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    },
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = "j".repeat(32);
  process.env.CSRF_SECRET = "c".repeat(32);
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/callback";
  process.env.ENABLE_DEMO_LOGIN = "true";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
  delete process.env.CSRF_SECRET;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REDIRECT_URI;
  delete process.env.ENABLE_DEMO_LOGIN;
});

beforeEach(async () => {
  await clearDatabase();
  vi.mocked(signAccessJwt).mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("auth.callback integration", () => {
  it("creates a new user and sets JWT session cookie on first OAuth login", async () => {
    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    const result = await caller.callback({ code: "google-oauth-code" });

    expect(result.user.email).toBe("alice@example.com");
    expect(result.user.role).toBe("creator");

    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, "alice@example.com"));
    expect(dbUser).toHaveLength(1);
    expect(dbUser[0]?.fullName).toBe("Alice Example");

    expect(signAccessJwt).toHaveBeenCalledWith(dbUser[0]?.id, "creator");
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "chaiforms-access",
      "mock.access.jwt",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("reuses an existing user on subsequent OAuth login (upsert idempotency)", async () => {
    const existingUser = {
      id: DEMO_USER_ID,
      email: "alice@example.com",
      fullName: "Alice Existing Example",
      role: "creator" as const,
      emailVerified: true,
      neonAuthUserId: "google-sub-abc123", // Google login maps to this field
    };

    await db.insert(usersTable).values(existingUser);

    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    const result = await caller.callback({ code: "google-oauth-code" });

    expect(result.user.id).toBe(DEMO_USER_ID);

    const dbUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, "alice@example.com"));
    expect(dbUsers).toHaveLength(1); // Should still only have 1
  });

  it("demoLogin sets session cookie for demo creator when ENABLE_DEMO_LOGIN=true", async () => {
    await db.insert(usersTable).values({
      id: DEMO_USER_ID,
      email: "demo@chaiforms.dev",
      fullName: "ChaiForms Demo",
      role: "creator",
      emailVerified: true,
    });

    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    const result = await caller.demoLogin({ email: "demo@chaiforms.dev" });

    expect(result.user.email).toBe("demo@chaiforms.dev");
    expect(signAccessJwt).toHaveBeenCalled();
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "chaiforms-access",
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("demoLogin returns NOT_FOUND when ENABLE_DEMO_LOGIN is false", async () => {
    process.env.ENABLE_DEMO_LOGIN = "false";

    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    await expect(caller.demoLogin({ email: "demo@chaiforms.dev" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    process.env.ENABLE_DEMO_LOGIN = "true";
  });
});
