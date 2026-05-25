import { describe, it, expect } from "vitest";
import { evaluateConditionalRules, getVisibleFields } from "../conditional-logic";
import { FieldSchemaUnion } from "@repo/schemas";

describe("conditional-logic", () => {
  const baseField: any = {
    id: "f2",
    type: "short_text",
    label: "Follow up",
    required: false,
  };

  it("returns true when there are no conditional rules", () => {
    const field = { ...baseField };
    expect(evaluateConditionalRules(field, {})).toBe(true);
  });

  describe("is_empty / is_not_empty", () => {
    it("evaluates is_empty correctly", () => {
      const field = {
        ...baseField,
        conditionalRules: [{ sourceFieldId: "f1", operator: "is_empty", value: "" }],
      };

      expect(evaluateConditionalRules(field, {})).toBe(true); // undefined
      expect(evaluateConditionalRules(field, { f1: null })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: "   " })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: [] })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: "value" })).toBe(false);
      expect(evaluateConditionalRules(field, { f1: ["value"] })).toBe(false);
    });

    it("evaluates is_not_empty correctly", () => {
      const field = {
        ...baseField,
        conditionalRules: [{ sourceFieldId: "f1", operator: "is_not_empty", value: "" }],
      };

      expect(evaluateConditionalRules(field, { f1: "value" })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: ["value"] })).toBe(true);
      expect(evaluateConditionalRules(field, {})).toBe(false);
      expect(evaluateConditionalRules(field, { f1: "   " })).toBe(false);
      expect(evaluateConditionalRules(field, { f1: [] })).toBe(false);
    });
  });

  describe("equals / not_equals", () => {
    it("evaluates equals correctly", () => {
      const field = {
        ...baseField,
        conditionalRules: [{ sourceFieldId: "f1", operator: "equals", value: "yes" }],
      };

      expect(evaluateConditionalRules(field, { f1: "yes" })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: "no" })).toBe(false);

      // Array support
      expect(evaluateConditionalRules(field, { f1: ["yes", "maybe"] })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: ["no"] })).toBe(false);
    });

    it("evaluates not_equals correctly", () => {
      const field = {
        ...baseField,
        conditionalRules: [{ sourceFieldId: "f1", operator: "not_equals", value: "yes" }],
      };

      expect(evaluateConditionalRules(field, { f1: "no" })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: "yes" })).toBe(false);

      // Array support
      expect(evaluateConditionalRules(field, { f1: ["no"] })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: ["yes"] })).toBe(false);
    });
  });

  describe("contains", () => {
    it("evaluates contains correctly", () => {
      const field = {
        ...baseField,
        conditionalRules: [{ sourceFieldId: "f1", operator: "contains", value: "cat" }],
      };

      expect(evaluateConditionalRules(field, { f1: "I like cats" })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: "dog" })).toBe(false);

      // Array support
      expect(evaluateConditionalRules(field, { f1: ["dog", "cat"] })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: ["dog"] })).toBe(false);
    });
  });

  describe("multiple rules (AND logic)", () => {
    it("returns true only when all rules match", () => {
      const field = {
        ...baseField,
        conditionalRules: [
          { sourceFieldId: "f1", operator: "equals", value: "yes" },
          { sourceFieldId: "f2", operator: "is_not_empty", value: "" },
        ],
      };

      expect(evaluateConditionalRules(field, { f1: "yes", f2: "value" })).toBe(true);
      expect(evaluateConditionalRules(field, { f1: "yes", f2: "" })).toBe(false); // f2 fails
      expect(evaluateConditionalRules(field, { f1: "no", f2: "value" })).toBe(false); // f1 fails
    });
  });

  describe("getVisibleFields", () => {
    it("filters out fields whose rules do not match", () => {
      const fields: FieldSchemaUnion[] = [
        { id: "f1", type: "short_text", label: "q1", required: false },
        {
          id: "f2",
          type: "short_text",
          label: "q2",
          required: false,
          conditionalRules: {
            combinator: "AND",
            rules: [{ field: "f1", operator: "equals", value: "yes" }],
          },
        },
        {
          id: "f3",
          type: "short_text",
          label: "q3",
          required: false,
          conditionalRules: {
            combinator: "AND",
            rules: [{ field: "f1", operator: "equals", value: "no" }],
          },
        },
      ];

      const visibleFields = getVisibleFields(fields, { f1: "yes" });
      expect(visibleFields.map((f) => f.id)).toEqual(["f1", "f2"]);

      const visibleFields2 = getVisibleFields(fields, { f1: "no" });
      expect(visibleFields2.map((f) => f.id)).toEqual(["f1", "f3"]);

      const visibleFields3 = getVisibleFields(fields, { f1: "maybe" });
      expect(visibleFields3.map((f) => f.id)).toEqual(["f1"]);
    });
  });
});
