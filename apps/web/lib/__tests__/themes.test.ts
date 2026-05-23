import { describe, it, expect } from "vitest";

import {
  FORM_CSS_VARIABLES,
  THEME_KEYS,
  THEMES,
  type ThemeKey,
  isThemeKey,
} from "../themes";

describe("themes", () => {
  it("defines all 8 theme keys", () => {
    expect(THEME_KEYS).toHaveLength(8);
    expect(THEME_KEYS).toEqual(
      expect.arrayContaining([
        "default",
        "anime",
        "movie",
        "game",
        "startup",
        "tech_company",
        "os",
        "event",
      ]),
    );
  });

  it("each theme defines every required CSS variable", () => {
    for (const key of THEME_KEYS) {
      const vars = THEMES[key];
      for (const cssVar of FORM_CSS_VARIABLES) {
        expect(vars[cssVar], `${key} missing ${cssVar}`).toBeTruthy();
        expect(vars[cssVar].length).toBeGreaterThan(0);
      }
    }
  });

  it("ThemeKey type covers all theme keys", () => {
    const keys: ThemeKey[] = THEME_KEYS;
    expect(keys.length).toBe(8);

    for (const key of keys) {
      expect(isThemeKey(key)).toBe(true);
    }
    expect(isThemeKey("not-a-theme")).toBe(false);
  });
});
