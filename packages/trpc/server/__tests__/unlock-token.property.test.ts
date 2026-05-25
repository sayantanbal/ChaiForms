import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import bcrypt from "bcryptjs";
import { formsRouter } from "../routes/forms/route";
import { verifyUnlockToken } from "../utils/jwt";
import { db } from "@repo/database";

vi.mock("@repo/database", () => ({
  isNull: vi.fn(),
  db: {
    select: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  desc: vi.fn(),
}));

vi.mock("../utils/unlock-rate-limit", () => ({
  assertUnlockRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    slug: "slug",
  },
}));

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
};

describe("forms.unlock", () => {
  // Feature: form-builder-saas, Property 18: Unlock token correctness
  it("returns a valid unlock token for correct passwords", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc
          .tuple(
            fc.constantFrom("a", "b", "c"),
            fc.constantFrom("A", "B", "C"),
            fc.constantFrom("0", "1", "2"),
            fc.string({ minLength: 5, maxLength: 8 }),
          )
          .map(([a, b, c, rest]) => `${a}${b}${c}${rest}`),
        async (formId, password) => {
          const hash = await bcrypt.hash(password, 8);
          const form = {
            id: formId,
            slug: "protected-form",
            accessPasswordHash: hash,
          };

          mockDb.select.mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([form]),
          }));

          const caller = formsRouter.createCaller({
            user: null,
            req: { headers: {}, cookies: {} } as any,
            res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
          });

          const result = await caller.unlock({
            slug: form.slug,
            password,
          });

          expect(verifyUnlockToken(result.unlockToken, formId)).toBe(true);
        },
      ),
      { numRuns: 10 },
    );
  });

  // Feature: form-builder-saas, Property 18: Unlock token correctness
  it("rejects incorrect passwords", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc
          .tuple(
            fc.constantFrom("a", "b", "c"),
            fc.constantFrom("A", "B", "C"),
            fc.constantFrom("0", "1", "2"),
            fc.string({ minLength: 5, maxLength: 8 }),
          )
          .map(([a, b, c, rest]) => `${a}${b}${c}${rest}`),
        fc
          .tuple(
            fc.constantFrom("a", "b", "c"),
            fc.constantFrom("A", "B", "C"),
            fc.constantFrom("0", "1", "2"),
            fc.string({ minLength: 5, maxLength: 8 }),
          )
          .map(([a, b, c, rest]) => `${a}${b}${c}${rest}`),
        async (formId, password, wrongPassword) => {
          fc.pre(password !== wrongPassword);
          const hash = await bcrypt.hash(password, 8);
          const form = {
            id: formId,
            slug: "protected-form",
            accessPasswordHash: hash,
          };

          mockDb.select.mockImplementation(() => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([form]),
          }));

          const caller = formsRouter.createCaller({
            user: null,
            req: { headers: {}, cookies: {} } as any,
            res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
          });

          await expect(
            caller.unlock({ slug: form.slug, password: wrongPassword }),
          ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
        },
      ),
      { numRuns: 10 },
    );
  });
});
