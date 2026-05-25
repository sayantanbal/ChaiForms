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
  id: "1aa6ff05-8d49-409c-9a5a-19b7c4863034",
  role: "creator" as const,
};

const baseForm = {
  id: "c0dfe4c8-854a-4e57-8429-64f5d2f1f599",
  creatorId: user.id,
  title: "Original",
  description: "Desc",
  slug: "original-slug",
  status: "draft" as const,
  visibility: "unlisted" as const,
  theme: "default" as const,
  fields: [],
  thankyouMessage: null as string | null,
  expiryDate: null as Date | null,
  responseLimit: null as number | null,
  accessPasswordHash: null as string | null,
  sendRespondentConfirmation: false,
  createdAt: new Date(),
  updatedAt: null as Date | null,
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

const settingsArb = fc.record(
  {
    title: fc.option(fc.string({ minLength: 1, maxLength: 40 }), {
      nil: undefined,
    }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 80 }), {
      nil: undefined,
    }),
    slug: fc.option(validSlugArb(), { nil: undefined }),
    visibility: fc.option(fc.constantFrom("public", "unlisted"), {
      nil: undefined,
    }),
    theme: fc.option(
      fc.constantFrom(
        "default",
        "anime",
        "movie",
        "game",
        "startup",
        "tech_company",
        "os",
        "event",
      ),
      { nil: undefined },
    ),
    thankyouMessage: fc.option(fc.string({ minLength: 1, maxLength: 80 }), {
      nil: undefined,
    }),
    expiryDate: fc.option(
      fc
        .date({
          min: new Date("2024-01-01T00:00:00.000Z"),
          max: new Date("2025-12-31T23:59:59.000Z"),
        })
        .filter((d) => !Number.isNaN(d.getTime()))
        .map((d) => d.toISOString().replace(/\.\d{3}Z$/, "Z")),
      { nil: undefined },
    ),
    responseLimit: fc.option(fc.integer({ min: 1, max: 100 }), {
      nil: undefined,
    }),
    sendRespondentConfirmation: fc.option(fc.boolean(), { nil: undefined }),
  },
  { requiredKeys: [] },
);

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

describe("forms.update", () => {
  // Feature: form-builder-saas, Property 3: Partial update preserves unmodified fields
  it("only updates provided fields", async () => {
    await fc.assert(
      fc.asyncProperty(settingsArb, async (settings) => {
        let updateData: Record<string, unknown> | null = null;
        const selectQueue: unknown[][] = [[baseForm]];
        if (settings.slug && settings.slug !== baseForm.slug) {
          selectQueue.push([]);
        }

        mockDb.select.mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
        }));

        mockDb.update.mockImplementation(() => {
          const chain = {
            set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
              updateData = values;
              return chain;
            }),
            where: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([baseForm]),
          };
          return chain;
        });

        const ctx = createContext();
        const caller = formsRouter.createCaller(ctx);
        await caller.update({ formId: baseForm.id, ...settings });

        const expectedKeys: string[] = [];
        if (settings.title !== undefined) expectedKeys.push("title");
        if (settings.description !== undefined) expectedKeys.push("description");
        if (settings.slug !== undefined) expectedKeys.push("slug");
        if (settings.visibility !== undefined) expectedKeys.push("visibility");
        if (settings.theme !== undefined) expectedKeys.push("theme");
        if (settings.thankyouMessage !== undefined) expectedKeys.push("thankyouMessage");
        if (settings.expiryDate !== undefined) expectedKeys.push("expiryDate");
        if (settings.responseLimit !== undefined) expectedKeys.push("responseLimit");
        if (settings.sendRespondentConfirmation !== undefined)
          expectedKeys.push("sendRespondentConfirmation");

        const updatedKeys = Object.keys(updateData ?? {});
        expect(updatedKeys.sort()).toEqual(expectedKeys.sort());

        if (settings.expiryDate !== undefined && updateData) {
          expect(updateData.expiryDate).toBeInstanceOf(Date);
        }
      }),
      { numRuns: 100 },
    );
  });
});
