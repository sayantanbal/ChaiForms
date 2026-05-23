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
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
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
  },
  pagesTable: {
    formId: "formId",
    order: "order",
  },
}));

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const envKeys = ["CSRF_SECRET", "JWT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};

function createContext(userId: string, method: string) {
  const token = createCsrfToken();
  return {
    user: { id: userId, role: "creator" as const },
    req: {
      headers: { [CSRF_HEADER_NAME]: token },
      cookies: { [CSRF_COOKIE_NAME]: token },
      method,
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

describe("forms ownership", () => {
  // Feature: form-builder-saas, Property 4: Ownership enforcement on mutations
  it("rejects mutations from non-owners", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (ownerId, otherUserId) => {
        fc.pre(ownerId !== otherUserId);

        const form = {
          id: "b206b6d3-0dbe-4b88-99f8-3c17f14d1dc7",
          creatorId: ownerId,
        };

        mockDb.select.mockImplementation(() => ({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([form]),
        }));

        const updateCaller = formsRouter.createCaller(
          createContext(otherUserId, "PATCH"),
        );
        const deleteCaller = formsRouter.createCaller(
          createContext(otherUserId, "DELETE"),
        );
        const cloneCaller = formsRouter.createCaller(
          createContext(otherUserId, "POST"),
        );
        const fieldsCaller = formsRouter.createCaller(
          createContext(otherUserId, "PUT"),
        );

        await expect(
          updateCaller.update({ formId: form.id, title: "Nope" }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });

        await expect(
          deleteCaller.delete({ formId: form.id }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });

        await expect(
          cloneCaller.clone({ formId: form.id }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });

        await expect(
          fieldsCaller.fieldsUpsert({
            formId: form.id,
            fields: [],
          }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      }),
      { numRuns: 100 },
    );
  });
});
