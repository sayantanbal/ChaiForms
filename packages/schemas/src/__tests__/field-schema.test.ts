import { describe, expect, it } from "vitest";
import {
  FieldSchemaUnion,
  shortTextFieldSchema,
  longTextFieldSchema,
  emailFieldSchema,
  numberFieldSchema,
  singleSelectFieldSchema,
  multiSelectFieldSchema,
  checkboxFieldSchema,
  ratingFieldSchema,
  dateFieldSchema,
} from "../fields/index.js";
import { slugPattern } from "../form-settings.js";
import { submitResponseSchema } from "../response.js";
import { analyticsSummarySchema } from "../analytics.js";

const fieldId = "550e8400-e29b-41d4-a716-446655440000";

function baseField(overrides: Record<string, unknown> = {}) {
  return {
    id: fieldId,
    label: "Test Field",
    required: false,
    ...overrides,
  };
}

describe("short_text field", () => {
  it("accepts valid short text field", () => {
    const result = shortTextFieldSchema.safeParse({
      ...baseField(),
      type: "short_text",
      minLength: 1,
      maxLength: 100,
      validationRegex: "^[a-z]+$",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty label", () => {
    const result = shortTextFieldSchema.safeParse({
      ...baseField({ label: "" }),
      type: "short_text",
    });
    expect(result.success).toBe(false);
  });
});

describe("long_text field", () => {
  it("accepts valid long text field", () => {
    const result = longTextFieldSchema.safeParse({
      ...baseField(),
      type: "long_text",
      maxLength: 5000,
    });
    expect(result.success).toBe(true);
  });
});

describe("email field", () => {
  it("accepts valid email field", () => {
    const result = emailFieldSchema.safeParse({
      ...baseField(),
      type: "email",
    });
    expect(result.success).toBe(true);
  });
});

describe("number field", () => {
  it("accepts valid number field with min/max", () => {
    const result = numberFieldSchema.safeParse({
      ...baseField(),
      type: "number",
      min: 0,
      max: 100,
    });
    expect(result.success).toBe(true);
  });
});

describe("single_select field", () => {
  it("accepts field with at least 2 options", () => {
    const result = singleSelectFieldSchema.safeParse({
      ...baseField(),
      type: "single_select",
      options: ["A", "B"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 options", () => {
    const result = singleSelectFieldSchema.safeParse({
      ...baseField(),
      type: "single_select",
      options: ["Only one"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty option strings", () => {
    const result = singleSelectFieldSchema.safeParse({
      ...baseField(),
      type: "single_select",
      options: ["", "B"],
    });
    expect(result.success).toBe(false);
  });
});

describe("multi_select field", () => {
  it("accepts field with at least 2 options", () => {
    const result = multiSelectFieldSchema.safeParse({
      ...baseField(),
      type: "multi_select",
      options: ["Red", "Blue", "Green"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 options", () => {
    const result = multiSelectFieldSchema.safeParse({
      ...baseField(),
      type: "multi_select",
      options: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("checkbox field", () => {
  it("accepts valid checkbox field", () => {
    const result = checkboxFieldSchema.safeParse({
      ...baseField(),
      type: "checkbox",
    });
    expect(result.success).toBe(true);
  });
});

describe("rating field", () => {
  it("accepts maxRating at boundaries 2 and 10", () => {
    expect(
      ratingFieldSchema.safeParse({
        ...baseField(),
        type: "rating",
        maxRating: 2,
      }).success,
    ).toBe(true);
    expect(
      ratingFieldSchema.safeParse({
        ...baseField(),
        type: "rating",
        maxRating: 10,
      }).success,
    ).toBe(true);
  });

  it("rejects maxRating below 2", () => {
    const result = ratingFieldSchema.safeParse({
      ...baseField(),
      type: "rating",
      maxRating: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxRating above 10", () => {
    const result = ratingFieldSchema.safeParse({
      ...baseField(),
      type: "rating",
      maxRating: 11,
    });
    expect(result.success).toBe(false);
  });
});

describe("date field", () => {
  it("accepts valid ISO datetime bounds", () => {
    const result = dateFieldSchema.safeParse({
      ...baseField(),
      type: "date",
      minDate: "2024-01-01T00:00:00.000Z",
      maxDate: "2025-12-31T23:59:59.999Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid ISO datetime", () => {
    const result = dateFieldSchema.safeParse({
      ...baseField(),
      type: "date",
      minDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("FieldSchemaUnion", () => {
  it("accepts all 9 field types via discriminated union", () => {
    const variants = [
      { type: "short_text" as const },
      { type: "long_text" as const },
      { type: "email" as const },
      { type: "number" as const },
      { type: "single_select" as const, options: ["A", "B"] },
      { type: "multi_select" as const, options: ["X", "Y"] },
      { type: "checkbox" as const },
      { type: "rating" as const, maxRating: 5 },
      { type: "date" as const },
    ];

    for (const variant of variants) {
      const result = FieldSchemaUnion.safeParse({
        ...baseField(),
        ...variant,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown field type", () => {
    const result = FieldSchemaUnion.safeParse({
      ...baseField(),
      type: "unknown_type",
    });
    expect(result.success).toBe(false);
  });

  it("accepts conditional rules on base field", () => {
    const sourceId = "660e8400-e29b-41d4-a716-446655440001";
    const result = FieldSchemaUnion.safeParse({
      ...baseField(),
      type: "short_text",
      conditionalRules: {
        combinator: "AND",
        rules: [
          {
            field: sourceId,
            operator: "equals",
            value: "yes",
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("slugPattern", () => {
  it("matches valid slugs", () => {
    expect(slugPattern.test("my-form")).toBe(true);
    expect(slugPattern.test("abc")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(slugPattern.test("ab")).toBe(false);
    expect(slugPattern.test("My-Form")).toBe(false);
    expect(slugPattern.test("form_with_underscore")).toBe(false);
  });
});

describe("submitResponseSchema", () => {
  it("accepts valid submission payload", () => {
    const result = submitResponseSchema.safeParse({
      formId: fieldId,
      startedAt: "2024-06-01T12:00:00.000Z",
      answers: [{ fieldId, value: "hello" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("analyticsSummarySchema", () => {
  it("accepts valid analytics summary", () => {
    const result = analyticsSummarySchema.safeParse({
      totalResponses: 10,
      completionRate: 85.5,
      avgDurationSeconds: 120,
    });
    expect(result.success).toBe(true);
  });

  it("rejects completion rate above 100", () => {
    const result = analyticsSummarySchema.safeParse({
      totalResponses: 10,
      completionRate: 101,
      avgDurationSeconds: null,
    });
    expect(result.success).toBe(false);
  });
});
