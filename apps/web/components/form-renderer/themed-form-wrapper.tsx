import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";
import {
  getThemeVariables,
  resolveThemeKey,
  type ThemeKey,
} from "~/lib/themes";

interface ThemedFormWrapperProps {
  theme: ThemeKey | string;
  children: ReactNode;
  className?: string;
}

export function ThemedFormWrapper({
  theme,
  children,
  className,
}: ThemedFormWrapperProps) {
  const themeKey = resolveThemeKey(theme);
  const vars = getThemeVariables(themeKey);

  return (
    <div
      style={vars as CSSProperties}
      className={cn(
        "min-h-screen bg-[var(--form-bg)] text-[var(--form-text)] [font-family:var(--form-font)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
