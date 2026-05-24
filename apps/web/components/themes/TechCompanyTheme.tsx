import React from "react";
import { ThemeKey } from "../../lib/themes";
import { ThemeComponents } from "../../lib/theme-registry";
import { cn } from "../../lib/utils";
import { BaseThemeComponents } from "./BaseTheme";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full relative bg-[#f3f4f6]"
      style={{
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <style>{`
        /* Datadog / analytical dashboard styling */
        .tech-theme-scope {
          --form-bg: #f3f4f6;
          --form-surface: #ffffff;
          --form-text: #2a2a2a;
          --form-muted: #6b7280;
          --form-primary: #632ca6; /* Datadog purple */
          --form-primary-fg: #ffffff;
          --form-border: #e5e7eb;
        }
      `}</style>
      
      {/* Top dashboard nav illusion */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#2b2b2b] border-b border-[#1a1a1a] flex items-center px-4 gap-4 z-0">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="text-xs text-gray-400 font-mono">system.dashboard.view</div>
      </div>

      <div className="relative z-10 tech-theme-scope pt-12">
        {children}
      </div>
    </div>
  );
}

function Card(props: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "bg-[var(--form-surface)] border border-[var(--form-border)] rounded shadow-sm p-8",
        props.className
      )}
    />
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-white text-[var(--form-text)] border border-[var(--form-border)] rounded px-3 py-2 text-sm font-mono transition-colors focus:outline-none focus:border-[var(--form-primary)] focus:ring-1 focus:ring-[var(--form-primary)] placeholder:text-[var(--form-muted)]",
        props.className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full bg-white text-[var(--form-text)] border border-[var(--form-border)] rounded px-3 py-2 text-sm font-mono transition-colors focus:outline-none focus:border-[var(--form-primary)] focus:ring-1 focus:ring-[var(--form-primary)] placeholder:text-[var(--form-muted)] resize-y",
        props.className
      )}
    />
  );
}

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "px-6 py-2 text-sm font-semibold rounded bg-[var(--form-primary)] text-[var(--form-primary-fg)] transition-colors hover:bg-[#52228c] shadow-sm disabled:opacity-50 disabled:pointer-events-none",
        props.className
      )}
      style={props.style ? { ...props.style, backgroundColor: props.style.backgroundColor || "var(--form-primary)", color: props.style.color || "var(--form-primary-fg)", border: "none" } : undefined}
    >
      {props.children}
    </button>
  );
}

export const TechCompanyThemeComponents: ThemeComponents = {
  ...BaseThemeComponents,
  Wrapper,
  Card,
  Input,
  Textarea,
  Button,
};
