"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "default", label: "Default", color: "bg-zinc-100 dark:bg-zinc-900" },
  { id: "anime", label: "Anime", color: "bg-pink-100 dark:bg-pink-900" },
  { id: "movie", label: "Movie", color: "bg-red-100 dark:bg-red-900" },
  { id: "game", label: "Game", color: "bg-green-100 dark:bg-green-900" },
  { id: "startup", label: "Startup", color: "bg-blue-100 dark:bg-blue-900" },
  { id: "tech_company", label: "Tech Co", color: "bg-indigo-100 dark:bg-indigo-900" },
  { id: "os", label: "OS", color: "bg-slate-100 dark:bg-slate-900" },
  { id: "event", label: "Event", color: "bg-orange-100 dark:bg-orange-900" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

interface ThemePickerProps {
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  customTheme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  onCustomThemeChange?: (theme: any) => void;
}

export function ThemePicker({
  currentTheme,
  onSelectTheme,
  customTheme,
  onCustomThemeChange,
}: ThemePickerProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Form Theme</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelectTheme(theme.id as ThemeId)}
            className={cn(
              "relative group flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
              currentTheme === theme.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
            )}
          >
            <div
              className={cn(
                "w-full aspect-video rounded-md shadow-inner relative flex items-center justify-center",
                theme.color,
              )}
            >
              {currentTheme === theme.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-center">{theme.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-6">
        <h3 className="text-sm font-semibold mb-4">Custom Theme Override</h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customTheme?.primaryColor || "#f97316"}
                onChange={(e) =>
                  onCustomThemeChange?.({ ...customTheme, primaryColor: e.target.value })
                }
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {customTheme?.primaryColor || "#f97316"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customTheme?.backgroundColor || "#1e293b"}
                onChange={(e) =>
                  onCustomThemeChange?.({ ...customTheme, backgroundColor: e.target.value })
                }
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {customTheme?.backgroundColor || "#1e293b"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customTheme?.textColor || "#f8fafc"}
                onChange={(e) =>
                  onCustomThemeChange?.({ ...customTheme, textColor: e.target.value })
                }
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {customTheme?.textColor || "#f8fafc"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
