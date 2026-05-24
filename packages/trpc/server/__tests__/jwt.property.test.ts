import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";
import { signAccessJwt, verifyAccessJwt } from "../utils/jwt";

const originalJwtSecret = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = "j".repeat(32);
});

afterAll(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

describe("jwt utils", () => {
  // Feature: form-builder-saas, Property 20: JWT authentication context attachment
  it("round-trips user id through JWT", () => {
    fc.assert(
      fc.property(fc.uuid(), (userId) => {
        const token = signAccessJwt(userId);
        const payload = verifyAccessJwt(token);
        expect(payload.sub).toBe(userId);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: form-builder-saas, Property 20: JWT authentication context attachment
  it("rejects tampered tokens", () => {
    fc.assert(
      fc.property(fc.uuid(), (userId) => {
        const token = signAccessJwt(userId);
        const last = token.slice(-1);
        const replacement = last === "a" ? "b" : "a";
        const tampered = `${token.slice(0, -1)}${replacement}`;
        expect(() => verifyAccessJwt(tampered)).toThrow();
      }),
      { numRuns: 100 },
    );
  });
});
