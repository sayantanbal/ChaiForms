import { z } from "zod";

/**
 * No-input procedures over httpLink receive `null`, `{}`, or omitted input after
 * JSON round-trip — not JavaScript `undefined`. Normalize those before validation.
 */
function normalizeVoidInput(val: unknown): void | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) {
    return undefined;
  }
  return val as void | undefined;
}

export const zodUndefinedModel = z.preprocess(normalizeVoidInput, z.void().optional());
export { z };
