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
  update: ReturnType<typeof vi.fn>;
};

const envKeys = ["CSRF_SECRET", "JWT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};

const user = {
  id: "6e4a1e31-4fdd-4f11-9de8-8f5c7b1f4b45",
  role: "creator" as const,
};

const baseForm = {
  id: "bdaf5b6f-10f5-4db2-9a70-38f4b875ee32",
  creatorId: user.id,
  slug: "existing-slug",
  title: "Form",
  description: null,
  status: "draft" as const,
  visibility: "unlisted" as const,
  theme: "default" as const,
  fields: [],
  thankyouMessage: null,
  expiryDate: null,
  responseLimit: null,
  accessPasswordHash: null,
  sendRespondentConfirmation: false,
  createdAt: new Date(),
  updatedAt: null,
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

const invalidSlugArb = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((slug) => !/^[a-z0-9-]{3,60}$/.test(slug));

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

describe("forms.update slug validation", () => {
  // Feature: form-builder-saas, Property 7: Slug validation pattern
  it("accepts valid slugs", async () => {
    await fc.assert(
      fc.asyncProperty(validSlugArb(), async (slug) => {
        const selectQueue: unknown[][] = [[baseForm]];
        if (slug !== baseForm.slug) {
          selectQueue.push([]);
        }

        mockDb.select.mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
        }));

        mockDb.update.mockImplementation(() => ({
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([baseForm]),
        }));

        const ctx = createContext();
        const caller = formsRouter.createCaller(ctx as any);
        const result = await caller.update({ formId: baseForm.id, slug });
        expect(result.slug).toBe(baseForm.slug);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: form-builder-saas, Property 7: Slug validation pattern
  it("rejects invalid slugs", async () => {
    await fc.assert(
      fc.asyncProperty(invalidSlugArb, async (slug) => {
        const selectQueue: unknown[][] = [[baseForm]];
        mockDb.select.mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
        }));

        const ctx = createContext();
        const caller = formsRouter.createCaller(ctx as any);

        await expect(caller.update({ formId: baseForm.id, slug })).rejects.toMatchObject({
          code: "BAD_REQUEST",
        });
      }),
      { numRuns: 100 },
    );
  });
});
