"use client";

import React from "react";
import { getThemeVariables, type ThemeKey } from "../../lib/themes";
import { ThemeContext } from "../../lib/theme-registry";
import { cn } from "../../lib/utils";

export const StartupThemeComponents = {
  Wrapper: function StartupWrapper({ children }: { children: React.ReactNode }) {
    const { name } = React.useContext(ThemeContext);
    const vars = getThemeVariables(name as ThemeKey) as React.CSSProperties;
    return (
      <div 
        className="relative min-h-screen w-full text-[var(--form-text)] selection:bg-[var(--form-primary)] selection:text-[var(--form-primary-fg)] transition-colors duration-300 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ 
          ...vars, 
          fontFamily: "'Redound', 'Inter', sans-serif",
          backgroundImage: "url('/images/startup_bg.png')"
        }}
      >
        <style>{`
          @font-face {
            font-family: 'Redound';
            src: url('/fonts/redound/redound-regular.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-24 relative z-10">
          {children}
        </div>
      </div>
    );
  },
  Background: function StartupBackground() {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--form-primary)] opacity-5 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--form-primary)] opacity-5 blur-[100px]" />
      </div>
    );
  },
  Input: function StartupInput(props: React.ComponentProps<"input">) {
    return (
      <input 
        {...props} 
        className={cn(
          "w-full bg-transparent px-0 py-2 text-base md:text-lg border-b border-transparent hover:border-[var(--form-border)] focus:border-[var(--form-primary)] focus:outline-none transition-colors duration-200 placeholder:text-[var(--form-muted)]",
          props.className
        )} 
      />
    );
  },
  Textarea: function StartupTextarea(props: React.ComponentProps<"textarea">) {
    return (
      <textarea 
        {...props} 
        className={cn(
          "w-full bg-transparent px-0 py-2 text-base md:text-lg border-b border-transparent hover:border-[var(--form-border)] focus:border-[var(--form-primary)] focus:outline-none transition-colors duration-200 min-h-[100px] resize-y placeholder:text-[var(--form-muted)]",
          props.className
        )} 
      />
    );
  },
  Button: function StartupButton(props: React.ComponentProps<"button">) {
    return (
      <button 
        {...props} 
        className={cn(
          "inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
          props.className
        )}
        style={{ backgroundColor: "var(--form-primary)", color: "var(--form-primary-fg)" }}
      >
        {props.children}
      </button>
    );
  },
  Card: function StartupCard(props: React.ComponentProps<"div">) {
    return (
      <div 
        {...props} 
        className={cn(
          "bg-white/90 backdrop-blur-md border border-[var(--form-border)] rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300",
          props.className
        )} 
      >
        {props.children}
      </div>
    );
  },
};
