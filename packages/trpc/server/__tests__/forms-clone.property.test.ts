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
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    slug: "slug",
    creatorId: "creatorId",
  },
  pagesTable: {
    formId: "formId",
    order: "order",
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

describe("forms.clone", () => {
  // Feature: form-builder-saas, Property 3: Form cloning creates a new distinct entity with copied schema
  it("creates a new distinct form with copied schema", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.array(fc.object()),
        async (title, description, fields) => {
          const originalFormId = "1a1c97a8-12d4-42b7-a8a2-231cbfe69a71";
          const originalForm = {
            id: originalFormId,
            creatorId: user.id,
            title,
            description,
            slug: "original-slug",
            status: "published",
            visibility: "public",
            theme: "default",
            fields,
            thankyouMessage: null,
            expiryDate: null,
            responseLimit: null,
            accessPasswordHash: null,
            sendRespondentConfirmation: false,
            createdAt: new Date(),
            updatedAt: null,
          };

          mockDb.select.mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([originalForm]),
            // For pages query, resolve to empty array
            then: (resolve: any) => resolve([]),
          }));

          mockDb.insert.mockImplementation(() => {
            const chain = {
              values: vi.fn().mockReturnThis(),
              returning: vi.fn().mockResolvedValue([
                {
                  id: "2d2d97a8-12d4-42b7-a8a2-231cbfe69a72",
                  creatorId: user.id,
                  title: originalForm.title,
                  description: originalForm.description,
                  slug: "cloned-slug",
                  status: "draft",
                  visibility: "unlisted",
                  theme: originalForm.theme,
                  fields: originalForm.fields,
                  thankyouMessage: originalForm.thankyouMessage,
                  expiryDate: null,
                  responseLimit: null,
                  accessPasswordHash: null,
                  sendRespondentConfirmation: originalForm.sendRespondentConfirmation,
                  createdAt: new Date(),
                  updatedAt: null,
                },
              ]),
            };
            return chain;
          });

          const ctx = createContext();
          const caller = formsRouter.createCaller(ctx);
          const clonedForm = await caller.clone({ formId: originalFormId });

          expect(clonedForm.id).not.toBe(originalForm.id);
          expect(clonedForm.slug).not.toBe(originalForm.slug);
          expect(clonedForm.status).toBe("draft");
          expect(clonedForm.visibility).toBe("unlisted");
          expect(clonedForm.title).toBe(originalForm.title);
          expect(clonedForm.fields).toEqual(originalForm.fields);
        },
      ),
      { numRuns: 100 },
    );
  });
});
