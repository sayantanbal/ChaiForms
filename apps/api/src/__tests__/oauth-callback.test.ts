/**
 * Integration test: OAuth callback flow
 *
 * Verifies that auth.callback:
 * - Exchanges Google OAuth code for user data (mocked)
 * - Upserts the user into usersTable (create on first call, reuse on second)
 * - Signs a JWT and sets the session HTTP-only cookie
 * - Returns { user } with correct email and role
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any imports that trigger side effects
// ---------------------------------------------------------------------------
vi.mock("../../../packages/trpc/server/utils/jwt", () => ({
  signJwt: vi.fn(() => "mock.jwt.token"),
  verifyJwt: vi.fn(),
}));

vi.mock("../../../packages/trpc/server/utils/csrf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../packages/trpc/server/utils/csrf")>();
  return {
    ...actual,
    // Expose real helper so createContext can generate valid tokens
  };
});

vi.mock("@repo/database", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  usersTable: { id: "id", email: "email", role: "role", fullName: "fullName" },
  formsTable: {},
  responsesTable: {},
  answersTable: {},
  templatesTable: {},
  pagesTable: {},
}));

// Mock Google token exchange (GoogleOAuth2Client.exchangeCode)
vi.mock("@repo/services/google-oauth", () => ({
  GoogleOAuth2Client: vi.fn().mockImplementation(() => ({
    exchangeCode: vi.fn().mockResolvedValue({
      email: "alice@example.com",
      name: "Alice Example",
      picture: null,
      sub: "google-sub-abc123",
    }),
  })),
}));

import { authRouter } from "../../../packages/trpc/server/routes/auth/route";
import { db } from "@repo/database";
import { signJwt } from "../../../packages/trpc/server/utils/jwt";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../../../packages/trpc/server/utils/csrf";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DEMO_USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

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

type SelectPlan = { type: "limit"; result: unknown[] } | { type: "where"; result: unknown[] };
type InsertPlan = { type: "returning"; result: unknown[] } | { type: "valuesOnly" };

let selectPlans: SelectPlan[] = [];
let insertPlans: InsertPlan[] = [];

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

beforeEach(() => {
  selectPlans = [];
  insertPlans = [];
  mockDb.select.mockReset();
  mockDb.insert.mockReset();

  mockDb.select.mockImplementation(() => {
    const plan = selectPlans.shift() ?? { type: "limit", result: [] };
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(plan.result),
    };
  });

  mockDb.insert.mockImplementation(() => {
    const plan = insertPlans.shift() ?? { type: "valuesOnly" };
    if (plan.type === "returning") {
      return {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(plan.result),
      };
    }
    return { values: vi.fn().mockResolvedValue(undefined) };
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("auth.callback integration", () => {
  it("creates a new user and sets JWT session cookie on first OAuth login", async () => {
    // First select → no existing user found
    selectPlans.push({ type: "limit", result: [] });
    // Insert → returns new user
    insertPlans.push({
      type: "returning",
      result: [
        {
          id: DEMO_USER_ID,
          email: "alice@example.com",
          fullName: "Alice Example",
          role: "creator",
          profileImageUrl: null,
          emailVerified: true,
        },
      ],
    });

    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    const result = await caller.callback({ code: "google-oauth-code" });

    expect(result.user.email).toBe("alice@example.com");
    expect(result.user.role).toBe("creator");
    expect(signJwt).toHaveBeenCalledWith(DEMO_USER_ID);
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "session",
      "mock.jwt.token",
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("reuses an existing user on subsequent OAuth login (upsert idempotency)", async () => {
    const existingUser = {
      id: DEMO_USER_ID,
      email: "alice@example.com",
      fullName: "Alice Example",
      role: "creator",
      profileImageUrl: null,
      emailVerified: true,
    };

    // First select → existing user found
    selectPlans.push({ type: "limit", result: [existingUser] });
    // Insert upsert → returns same user
    insertPlans.push({ type: "returning", result: [existingUser] });

    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    const result = await caller.callback({ code: "google-oauth-code" });

    expect(result.user.id).toBe(DEMO_USER_ID);
    // Should only have been inserted/updated once (upsert), not twice
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("demoLogin sets session cookie for demo creator when ENABLE_DEMO_LOGIN=true", async () => {
    selectPlans.push({
      type: "limit",
      result: [
        {
          id: DEMO_USER_ID,
          email: "demo@chaiforms.dev",
          fullName: "ChaiForms Demo",
          role: "creator",
          profileImageUrl: null,
          emailVerified: true,
        },
      ],
    });

    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    const result = await caller.demoLogin({ email: "demo@chaiforms.dev" });

    expect(result.user.email).toBe("demo@chaiforms.dev");
    expect(signJwt).toHaveBeenCalled();
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("demoLogin returns NOT_FOUND when ENABLE_DEMO_LOGIN is false", async () => {
    process.env.ENABLE_DEMO_LOGIN = "false";

    const ctx = buildCtx();
    const caller = authRouter.createCaller(ctx as any);

    await expect(
      caller.demoLogin({ email: "demo@chaiforms.dev" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    process.env.ENABLE_DEMO_LOGIN = "true";
  });
});
