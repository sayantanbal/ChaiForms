"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { ThemeKey } from "./themes";
import { resolveThemeKey } from "./themes";
import { BaseThemeComponents } from "../components/themes/BaseTheme";
import { StartupThemeComponents } from "../components/themes/StartupTheme";
import { OsThemeComponents } from "../components/themes/OsTheme";
import { AnimeThemeComponents } from "../components/themes/AnimeTheme";
import { TechCompanyThemeComponents } from "../components/themes/TechCompanyTheme";
import { MovieThemeComponents } from "../components/themes/MovieTheme";
import { GameThemeComponents } from "../components/themes/GameTheme";
import { EventThemeComponents } from "../components/themes/EventTheme";

export interface ThemeComponents {
  Wrapper: React.ComponentType<{ children: React.ReactNode }>;
  Input: React.ComponentType<React.ComponentProps<"input">>;
  Textarea: React.ComponentType<React.ComponentProps<"textarea">>;
  Button: React.ComponentType<React.ComponentProps<"button">>;
  Card: React.ComponentType<React.ComponentProps<"div">>;
  Background: React.ComponentType;
}

export const ThemeContext = createContext<{
  name: ThemeKey;
  components: ThemeComponents;
}>({
  name: "default",
  components: BaseThemeComponents,
});

export function useThemeRegistry() {
  return useContext(ThemeContext);
}

export function getThemeComponents(theme: ThemeKey): ThemeComponents {
  switch (theme) {
    case "startup":
      return StartupThemeComponents;
    case "os":
      return OsThemeComponents;
    case "anime":
      return AnimeThemeComponents;
    case "tech_company":
      return TechCompanyThemeComponents;
    case "movie":
      return MovieThemeComponents;
    case "game":
      return GameThemeComponents;
    case "event":
      return EventThemeComponents;
    case "default":
    default:
      return BaseThemeComponents;
  }
}

export function ThemeProvider({
  theme,
  customTheme,
  children,
}: {
  theme?: string | null;
  customTheme?: any | null;
  children: React.ReactNode;
}) {
  const resolvedTheme = resolveThemeKey(theme);
  const components = useMemo(() => getThemeComponents(resolvedTheme), [resolvedTheme]);

  const customStyles = useMemo(() => {
    if (!customTheme) return {};
    const styles: Record<string, string> = {};
    if (customTheme.primaryColor) styles["--form-primary"] = customTheme.primaryColor;
    if (customTheme.backgroundColor) {
      styles["--form-bg"] = customTheme.backgroundColor;
      styles["--form-surface"] = customTheme.backgroundColor;
    }
    if (customTheme.textColor) {
      styles["--form-text"] = customTheme.textColor;
      styles["--form-fg"] = customTheme.textColor;
    }
    return styles;
  }, [customTheme]);

  return (
    <ThemeContext.Provider value={{ name: resolvedTheme, components }}>
      <div style={customStyles as any} className="contents">
        <components.Wrapper>
          <components.Background />
          {children}
        </components.Wrapper>
      </div>
    </ThemeContext.Provider>
  );
}
