import * as fc from "fast-check";

const slugChars = "abcdefghijklmnopqrstuvwxyz0123456789-";

/** Generates slugs matching `^[a-z0-9-]{3,60}$` (fast-check v4 compatible). */
export function validSlugArb(minLength = 3, maxLength = 12) {
  return fc
    .array(fc.constantFrom(...slugChars.split("")), { minLength, maxLength })
    .map((chars) => chars.join(""));
}
