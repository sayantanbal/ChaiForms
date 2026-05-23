import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { FieldSchemaUnion } from "../fields/index.js";

const fieldId = "550e8400-e29b-41d4-a716-446655440000";

function baseField() {
  return {
    id: fieldId,
    label: "Property Test",
    required: false,
  };
}

// Feature: form-builder-saas, Property 1: FieldSchemaUnion discriminated-union correctness
describe("Property 1: FieldSchemaUnion discriminated-union correctness", () => {
  it("rating field rejects maxRating outside [2,10]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }).filter((n) => n < 2 || n > 10),
        (maxRating) => {
          const result = FieldSchemaUnion.safeParse({
            ...baseField(),
            type: "rating",
            maxRating,
          });
          return !result.success;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rating field accepts maxRating within [2,10]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), (maxRating) => {
        const result = FieldSchemaUnion.safeParse({
          ...baseField(),
          type: "rating",
          maxRating,
        });
        return result.success;
      }),
      { numRuns: 100 },
    );
  });

  it("single_select rejects fewer than 2 options", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { maxLength: 1 }),
        (options) => {
          const result = FieldSchemaUnion.safeParse({
            ...baseField(),
            type: "single_select",
            options,
          });
          return !result.success;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("multi_select rejects fewer than 2 options", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { maxLength: 1 }),
        (options) => {
          const result = FieldSchemaUnion.safeParse({
            ...baseField(),
            type: "multi_select",
            options,
          });
          return !result.success;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("single_select accepts valid option arrays", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
        (options) => {
          const result = FieldSchemaUnion.safeParse({
            ...baseField(),
            type: "single_select",
            options,
          });
          return result.success;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("valid short_text variants are accepted", () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
        fc.option(fc.integer({ min: 1, max: 200 }), { nil: undefined }),
        (minLength, maxLength) => {
          const result = FieldSchemaUnion.safeParse({
            ...baseField(),
            type: "short_text",
            minLength,
            maxLength,
          });
          return result.success;
        },
      ),
      { numRuns: 100 },
    );
  });
});
