import React from "react";
import { ThemeComponents } from "../../lib/theme-registry";
import { cn } from "../../lib/utils";
import { BaseThemeComponents } from "./BaseTheme";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-full w-full relative"
      style={{ fontFamily: "'Firlest', serif" }}
    >
      <style>{`
        @font-face {
          font-family: 'Firlest';
          src: url('/fonts/firlest/firlest-regular.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        .movie-theme-scope {
          --form-bg: #0a0a0a;
          --form-surface: rgba(15, 15, 15, 0.85);
          --form-text: #f5f5f5;
          --form-muted: #888888;
          --form-primary: #e50914; /* Cinematic red */
          --form-primary-fg: #ffffff;
          --form-border: #333333;
        }
      `}</style>
      
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: "url('/images/movie_bg.png')" }}
      />
      
      {/* Dark vignette overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

      <div className="relative z-10 h-full movie-theme-scope text-[var(--form-text)]">
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
        "bg-[var(--form-surface)] backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12 shadow-2xl",
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
        "w-full bg-black/50 text-[var(--form-text)] border border-white/20 rounded-lg px-4 py-3 text-lg transition-colors focus:outline-none focus:border-[var(--form-primary)] placeholder:text-[var(--form-muted)]",
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
        "w-full bg-black/50 text-[var(--form-text)] border border-white/20 rounded-lg px-4 py-3 text-lg transition-colors focus:outline-none focus:border-[var(--form-primary)] placeholder:text-[var(--form-muted)] resize-y min-h-[120px]",
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
        "px-8 py-3 rounded-lg font-bold text-lg tracking-wide bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        props.className
      )}
      style={props.style ? { ...props.style, backgroundColor: undefined, color: undefined, border: undefined } : undefined}
    >
      {props.children}
    </button>
  );
}

export const MovieThemeComponents: ThemeComponents = {
  ...BaseThemeComponents,
  Wrapper,
  Card,
  Input,
  Textarea,
  Button,
};
