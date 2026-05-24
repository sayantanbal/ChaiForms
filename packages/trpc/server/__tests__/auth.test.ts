import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { authRouter } from "../routes/auth/route";
import { adminRouter } from "../routes/admin/route";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../utils/csrf";
import { db } from "@repo/database";
import { signRefreshJwt } from "../utils/jwt";

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const baseUser = {
  id: "2e24d54e-6d5c-4c06-85d8-fd0e91b2a0f4",
  email: "demo@chaiforms.dev",
  fullName: "ChaiForms Demo",
  role: "creator" as const,
  profileImageUrl: null,
  emailVerified: true,
  isBlocked: false,
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
    delete: vi.fn(),
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
  refreshTokensTable: {
    id: "id",
    userId: "userId",
    tokenHash: "tokenHash",
    family: "family",
    expiresAt: "expiresAt",
    revokedAt: "revokedAt",
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

function mockDelete(rows: unknown[]) {
  const chain = {
    where: vi.fn().mockResolvedValue(rows),
  };
  mockDb.delete.mockReturnValue(chain);
  return chain;
}

function createContext(opts?: {
  user?: typeof baseUser | null;
  method?: string;
  withCsrf?: boolean;
  cookies?: Record<string, string>;
}) {
  const token = opts?.withCsrf ? createCsrfToken() : null;
  return {
    user: opts && "user" in opts ? opts.user : baseUser,
    req: {
      headers: token ? { [CSRF_HEADER_NAME]: token } : {},
      cookies: {
        ...(token ? { [CSRF_COOKIE_NAME]: token } : {}),
        ...(opts?.cookies ?? {}),
      },
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
  mockDb.delete.mockReset();
});

describe("auth router", () => {
  it("callback sets access, refresh, and csrf cookies", async () => {
    mockSelect([]); // user existing check
    mockInsert([baseUser]); // insert user
    mockInsert([]); // insert refresh token

    const ctx = createContext();
    const caller = authRouter.createCaller(ctx);
    const result = await caller.callback({ code: "valid-code" });

    expect(result.user.email).toBe(baseUser.email);
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "chaiforms-access",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "chaiforms-refresh",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "chaiforms-csrf",
      expect.any(String),
      expect.objectContaining({ sameSite: "strict" }),
    );
  });

  it("callback rejects blocked user", async () => {
    mockSelect([{ ...baseUser, isBlocked: true }]);

    const ctx = createContext();
    const caller = authRouter.createCaller(ctx);

    await expect(caller.callback({ code: "valid-code" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("signOut clears cookies and deletes refresh tokens", async () => {
    mockDelete([]);
    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = authRouter.createCaller(ctx);

    const result = await caller.signOut();
    expect(result.success).toBe(true);
    expect(ctx.res.clearCookie).toHaveBeenCalledWith("chaiforms-access", { path: "/" });
    expect(ctx.res.clearCookie).toHaveBeenCalledWith("chaiforms-refresh", expect.anything());
    expect(ctx.res.clearCookie).toHaveBeenCalledWith("chaiforms-csrf", { path: "/" });
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("demoLogin sets cookies for unblocked user", async () => {
    process.env.ENABLE_DEMO_LOGIN = "true";
    mockSelect([baseUser]);
    mockInsert([]);

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = authRouter.createCaller(ctx);
    const result = await caller.demoLogin({ email: "demo@chaiforms.dev" });

    expect(result.user.email).toBe(baseUser.email);
    expect(ctx.res.cookie).toHaveBeenCalledWith("chaiforms-access", expect.any(String), expect.anything());
  });

  it("demoLogin rejects blocked user", async () => {
    process.env.ENABLE_DEMO_LOGIN = "true";
    mockSelect([{ ...baseUser, isBlocked: true }]);

    const ctx = createContext({ method: "POST", withCsrf: true });
    const caller = authRouter.createCaller(ctx);

    await expect(caller.demoLogin({ email: "demo@chaiforms.dev" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refreshToken rotates token successfully", async () => {
    const fakeFamily = "family-123";
    const refreshJwt = signRefreshJwt(baseUser.id, fakeFamily);
    const fakeCookie = `plain-token:${refreshJwt}`;

    const ctx = createContext({ method: "POST", withCsrf: true, cookies: { "chaiforms-refresh": fakeCookie } });
    const caller = authRouter.createCaller(ctx);

    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValueOnce([ { id: "token-id", expiresAt: new Date(Date.now() + 100000) } ])
        .mockResolvedValueOnce([ baseUser ])
    };
    mockDb.select.mockReturnValue(mockSelectChain as any);

    mockDelete([]);
    mockInsert([]);

    const result = await caller.refreshToken();
    expect(result.success).toBe(true);
    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
    expect(ctx.res.cookie).toHaveBeenCalledWith("chaiforms-access", expect.any(String), expect.anything());
  });

  it("refreshToken detects reuse and revokes family", async () => {
    const fakeFamily = "family-123";
    const refreshJwt = signRefreshJwt(baseUser.id, fakeFamily);
    const fakeCookie = `plain-token:${refreshJwt}`;

    const ctx = createContext({ method: "POST", withCsrf: true, cookies: { "chaiforms-refresh": fakeCookie } });
    const caller = authRouter.createCaller(ctx);

    mockSelect([]);
    mockUpdate([]);

    await expect(caller.refreshToken()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Token reuse detected",
    });
    expect(mockDb.update).toHaveBeenCalled();
  });
});
