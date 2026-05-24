import { describe, it } from "vitest";
import * as fc from "fast-check";
import { evaluateConditionalRules, getVisibleFields } from "../conditional-logic";
import { FieldSchemaUnion } from "@repo/schemas";

describe("conditional-logic property tests", () => {
  // Feature: form-builder-saas, Property 21: Client-side conditional visibility
  
  it("evaluates is_empty correctly", () => {
    fc.assert(
      fc.property(
        fc.string(), 
        (str) => {
          const field: any = {
            id: "f2",
            type: "short_text",
            conditionalRules: [{ sourceFieldId: "f1", operator: "is_empty", value: "" }]
          };
          
          const result = evaluateConditionalRules(field, { f1: str });
          const expected = str.trim() === "";
          
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("evaluates equals correctly", () => {
    fc.assert(
      fc.property(
        fc.string(), fc.string(), 
        (ruleValue, answerValue) => {
          const field: any = {
            id: "f2",
            type: "short_text",
            conditionalRules: [{ sourceFieldId: "f1", operator: "equals", value: ruleValue }]
          };
          
          const result = evaluateConditionalRules(field, { f1: answerValue });
          const expected = ruleValue === answerValue;
          
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("evaluates contains correctly", () => {
    fc.assert(
      fc.property(
        fc.string(), fc.string(), 
        (ruleValue, answerValue) => {
          const field: any = {
            id: "f2",
            type: "short_text",
            conditionalRules: [{ sourceFieldId: "f1", operator: "contains", value: ruleValue }]
          };
          
          const result = evaluateConditionalRules(field, { f1: answerValue });
          const expected = answerValue.includes(ruleValue);
          
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("getVisibleFields always returns a subset of original fields", () => {
    // Generate an array of boolean flags for whether a field has rules
    // and whether those rules pass.
    fc.assert(
      fc.property(
        fc.array(fc.boolean()),
        (matches) => {
          const fields: any[] = matches.map((match, i) => {
            const hasRule = i % 2 === 0;
            return {
              id: `f${i}`,
              type: "short_text",
              conditionalRules: hasRule 
                ? [{ sourceFieldId: "trigger", operator: "equals", value: match ? "yes" : "no" }]
                : undefined
            };
          });

          // All triggers equal "yes"
          const answers = { trigger: "yes" };
          const visible = getVisibleFields(fields as FieldSchemaUnion[], answers);

          // The number of visible fields must be <= total fields
          if (visible.length > fields.length) return false;

          // Check that each visible field either has no rules or its rules passed
          return visible.every((f: any) => {
            if (!f.conditionalRules) return true;
            return f.conditionalRules[0].value === "yes";
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
