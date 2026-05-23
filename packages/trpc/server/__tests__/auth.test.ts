import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { authRouter } from "../routes/auth/route";
import { adminRouter } from "../routes/admin/route";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../utils/csrf";
import { db } from "@repo/database";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const baseUser = {
  id: "2e24d54e-6d5c-4c06-85d8-fd0e91b2a0f4",
  email: "demo@chaiforms.dev",
  fullName: "ChaiForms Demo",
  role: "creator" as const,
  profileImageUrl: null,
  emailVerified: true,
};

const envKeys = [
  "CSRF_SECRET",
  "JWT_SECRET",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "ENABLE_DEMO_LOGIN",
  "WEB_ORIGIN",
];
const originalEnv: Record<string, string | undefined> = {};

let mockGooglePayload = {
  email: "demo@chaiforms.dev",
  name: "ChaiForms Demo",
  picture: null as string | null,
  email_verified: true,
};
let mockTokenError: Error | null = null;

vi.mock("google-auth-library", () => {
  class OAuth2Client {
    generateAuthUrl() {
      return "https://accounts.google.com/o/oauth2/v2/auth";
    }
    async getToken() {
      if (mockTokenError) throw mockTokenError;
      return { tokens: { id_token: "test-id-token" } };
    }
    async verifyIdToken() {
      return {
        getPayload() {
          return mockGooglePayload;
        },
      };
    }
  }

  return { OAuth2Client };
});

vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  eq: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  usersTable: {
    id: "id",
    email: "email",
    role: "role",
    fullName: "fullName",
    profileImageUrl: "profileImageUrl",
    emailVerified: "emailVerified",
  },
}));

function mockSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockDb.select.mockReturnValue(chain);
  return chain;
}

function mockUpdate(rows: unknown[]) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
  };
  mockDb.update.mockReturnValue(chain);
  return chain;
}

function mockInsert(rows: unknown[]) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
  };
  mockDb.insert.mockReturnValue(chain);
  return chain;
}

function createContext(opts?: {
  user?: typeof baseUser | null;
  method?: string;
  withCsrf?: boolean;
}) {
  const token = opts?.withCsrf ? createCsrfToken() : null;
  return {
    user: opts?.user ?? baseUser,
    req: {
      headers: token ? { [CSRF_HEADER_NAME]: token } : {},
      cookies: token ? { [CSRF_COOKIE_NAME]: token } : {},
      method: opts?.method ?? "GET",
    },
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    },
  };
}

beforeAll(() => {
  for (const key of envKeys) {
    originalEnv[key] = process.env[key];
  }
  process.env.CSRF_SECRET = "c".repeat(32);
  process.env.JWT_SECRET = "j".repeat(32);
  process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost/auth/callback";
  process.env.WEB_ORIGIN = "http://localhost:3000";
});

afterAll(() => {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

beforeEach(() => {
  mockTokenError = null;
  mockDb.select.mockReset();
  mockDb.insert.mockReset();
  mockDb.update.mockReset();
});

describe("auth router", () => {
  it("callback sets a session cookie and returns user", async () => {
    mockSelect([]);
    mockInsert([baseUser]);

    const ctx = createContext();
    const caller = authRouter.createCaller(ctx);
    const result = await caller.callback({ code: "valid-code" });

    expect(result.user.email).toBe(baseUser.email);
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });

  it("callback returns BAD_REQUEST on invalid code", async () => {
    mockTokenError = new Error("invalid_code");
    const ctx = createContext();
    const caller = authRouter.createCaller(ctx);

    await expect(caller.callback({ code: "bad-code" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("me rejects missing user", async () => {
    const ctx = createContext({ user: null });
    const caller = authRouter.createCaller(ctx);

    await expect(caller.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("signOut clears session cookies", async () => {
    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = authRouter.createCaller(ctx);

    const result = await caller.signOut();
    expect(result.success).toBe(true);
    expect(ctx.res.clearCookie).toHaveBeenCalledWith("session", { path: "/" });
    expect(ctx.res.clearCookie).toHaveBeenCalledWith(
      "chaiforms-demo-session",
      { path: "/" },
    );
  });

  it("demoLogin is gated by ENABLE_DEMO_LOGIN", async () => {
    process.env.ENABLE_DEMO_LOGIN = "false";
    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = authRouter.createCaller(ctx);

    await expect(
      caller.demoLogin({ email: "demo@chaiforms.dev" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("demoLogin sets the session cookie", async () => {
    process.env.ENABLE_DEMO_LOGIN = "true";
    mockSelect([baseUser]);

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = authRouter.createCaller(ctx);
    const result = await caller.demoLogin({ email: "demo@chaiforms.dev" });

    expect(result.user.email).toBe(baseUser.email);
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });

  it("adminProcedure rejects non-admin users", async () => {
    const ctx = createContext({ user: { ...baseUser, role: "creator" } });
    const caller = adminRouter.createCaller(ctx);

    await expect(caller.getStats()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
