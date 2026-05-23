import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";
import { formsRouter } from "../routes/forms/route";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  createCsrfToken,
} from "../utils/csrf";
import { db } from "@repo/database";

vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    slug: "slug",
    creatorId: "creatorId",
  },
}));

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

const envKeys = ["CSRF_SECRET", "JWT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};

const user = {
  id: "f5b6c5c5-26c7-4c0e-8ad5-8d88b7c6cb31",
  role: "creator" as const,
};

function createContext() {
  const token = createCsrfToken();
  return {
    user,
    req: {
      headers: { [CSRF_HEADER_NAME]: token },
      cookies: { [CSRF_COOKIE_NAME]: token },
      method: "POST",
    },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  };
}

beforeAll(() => {
  for (const key of envKeys) {
    originalEnv[key] = process.env[key];
  }
  process.env.CSRF_SECRET = "c".repeat(32);
  process.env.JWT_SECRET = "j".repeat(32);
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

describe("forms.create", () => {
  // Feature: form-builder-saas, Property 2: Form creation defaults invariant
  it("creates draft unlisted forms for any valid title", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 64 }), async (title) => {
        const selectChain = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(selectChain);

        mockDb.insert.mockImplementation(() => {
          const chain = {
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([
              {
                id: "03a4c5d4-9da1-4b12-8bf9-0b9d8d16d2b1",
                creatorId: user.id,
                title,
                description: null,
                slug: "generated-slug",
                status: "draft",
                visibility: "unlisted",
                theme: "default",
                fields: [],
                thankyouMessage: null,
                expiryDate: null,
                responseLimit: null,
                accessPasswordHash: null,
                sendRespondentConfirmation: false,
                createdAt: new Date(),
                updatedAt: null,
              },
            ]),
          };
          return chain;
        });

        const ctx = createContext();
        const caller = formsRouter.createCaller(ctx);
        const result = await caller.create({ title });

        expect(result.creatorId).toBe(user.id);
        expect(result.status).toBe("draft");
        expect(result.visibility).toBe("unlisted");
      }),
      { numRuns: 100 },
    );
  });
});
