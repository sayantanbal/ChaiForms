import React from "react";
import { ThemeComponents } from "../../lib/theme-registry";
import { cn } from "../../lib/utils";
import { BaseThemeComponents } from "./BaseTheme";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-full w-full relative"
      style={{ fontFamily: "'Pixel Game', monospace" }}
    >
      <style>{`
        @font-face {
          font-family: 'Pixel Game';
          src: url('/fonts/pixel-game/pixel-game.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        .game-theme-scope {
          --form-bg: #000000;
          --form-surface: rgba(10, 10, 30, 0.9);
          --form-text: #39ff14; /* Neon green */
          --form-muted: #1f8a0d;
          --form-primary: #ff00ff; /* Magenta */
          --form-primary-fg: #ffffff;
          --form-border: #39ff14;
        }
      `}</style>
      
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: "url('/images/game_bg.png')" }}
      />
      
      {/* Scanlines overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 2px, black 3px, black 3px)" }} />

      <div className="relative z-10 h-full game-theme-scope text-[var(--form-text)]">
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
        "bg-[var(--form-surface)] border-4 border-[var(--form-border)] p-8 sm:p-12 shadow-[8px_8px_0_var(--form-primary)]",
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
        "w-full bg-black text-[var(--form-text)] border-4 border-[var(--form-border)] px-4 py-3 text-xl transition-all focus:outline-none focus:border-[var(--form-primary)] placeholder:text-[var(--form-muted)]",
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
        "w-full bg-black text-[var(--form-text)] border-4 border-[var(--form-border)] px-4 py-3 text-xl transition-all focus:outline-none focus:border-[var(--form-primary)] placeholder:text-[var(--form-muted)] resize-y min-h-[120px]",
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
        "px-8 py-3 font-bold text-xl uppercase tracking-widest bg-[var(--form-primary)] text-white border-4 border-[var(--form-primary)] shadow-[4px_4px_0_#fff] hover:shadow-[2px_2px_0_#fff] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-50 disabled:pointer-events-none",
        props.className
      )}
      style={props.style ? { ...props.style, backgroundColor: undefined, color: undefined, border: undefined } : undefined}
    >
      {props.children}
    </button>
  );
}

export const GameThemeComponents: ThemeComponents = {
  ...BaseThemeComponents,
  Wrapper,
  Card,
  Input,
  Textarea,
  Button,
};
