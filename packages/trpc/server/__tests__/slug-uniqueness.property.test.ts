import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";
import { formsRouter } from "../routes/forms/route";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, createCsrfToken } from "../utils/csrf";
import { db } from "@repo/database";
import { validSlugArb } from "./test-arbitraries";

vi.mock("@repo/database", () => ({
  isNull: vi.fn(),
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
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
  update: ReturnType<typeof vi.fn>;
};

const envKeys = ["CSRF_SECRET", "JWT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};

const user = {
  id: "444497a8-12d4-42b7-a8a2-231cbfe69a71",
  role: "creator" as const,
};

function createContext() {
  const token = createCsrfToken();
  return {
    user,
    req: {
      headers: { [CSRF_HEADER_NAME]: token },
      cookies: { [CSRF_COOKIE_NAME]: token },
      method: "PATCH",
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

describe("forms.update slug uniqueness", () => {
  // Feature: form-builder-saas, Property 5: Form URL slugs must be globally unique across all users
  it("rejects slug updates that conflict with existing forms", async () => {
    await fc.assert(
      fc.asyncProperty(
        validSlugArb().filter((slug) => slug !== "old-slug"),
        async (slug) => {
          const formId = "555597a8-12d4-42b7-a8a2-231cbfe69a71";
          const form = {
            id: formId,
            creatorId: user.id,
            title: "Title",
            description: null,
            slug: "old-slug",
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
          };

          const selectQueue: unknown[][] = [[form], [{ id: "another-form" }]]; // First is ownership check, second is conflict check

          mockDb.select.mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
          }));

          const ctx = createContext();
          const caller = formsRouter.createCaller(ctx as any);

          await expect(caller.update({ formId, slug })).rejects.toMatchObject({
            code: "CONFLICT",
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
