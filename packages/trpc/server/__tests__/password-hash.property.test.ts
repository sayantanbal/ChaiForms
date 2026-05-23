import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";
import bcrypt from "bcryptjs";
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
    creatorId: "creatorId",
    slug: "slug",
  },
}));

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const envKeys = ["CSRF_SECRET", "JWT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};

const user = {
  id: "53140d0d-2b4c-4ce8-91d9-d60fbd55e1d2",
  role: "creator" as const,
};

const baseForm = {
  id: "b2f040f9-41c6-4d4f-8bc0-7c2a7e52f5f4",
  creatorId: user.id,
  title: "Form",
  description: null,
  slug: "form",
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

describe("forms.update password hashing", () => {
  // Feature: form-builder-saas, Property 17: Password hash never stores plaintext
  it("hashes access passwords", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 4, maxLength: 16 }),
        async (password) => {
          const selectQueue: unknown[][] = [[baseForm]];
          mockDb.select.mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi
              .fn()
              .mockImplementation(() => Promise.resolve(selectQueue.shift() ?? [])),
          }));

          let updateData: Record<string, unknown> | null = null;
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
          await caller.update({ formId: baseForm.id, accessPassword: password });

          const hash = updateData?.accessPasswordHash as string | undefined;
          expect(hash).toBeTruthy();
          expect(hash).not.toBe(password);
          if (hash) {
            const matches = await bcrypt.compare(password, hash);
            expect(matches).toBe(true);
          }
        },
      ),
      { numRuns: 5 },
    );
  });
});
