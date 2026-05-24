import React from "react";
import { ThemeKey } from "../../lib/themes";
import { ThemeComponents } from "../../lib/theme-registry";
import { cn } from "../../lib/utils";

// Expose standard BaseTheme components to inherit standard structure
import { BaseThemeComponents } from "./BaseTheme";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-full w-full relative"
      style={{
        fontFamily: "'Manga Temple', 'Comic Sans MS', cursive, sans-serif",
      }}
    >
      <style>{`
        @font-face {
          font-family: 'Manga Temple';
          src: url('/fonts/manga-temple/mangat.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        /* Variables specific to AnimeTheme */
        .anime-theme-scope {
          --form-bg: transparent;
          --form-surface: rgba(255, 255, 255, 0.95);
          --form-text: #1a1a1a;
          --form-muted: #666666;
          --form-primary: #ff4d85;
          --form-primary-fg: #ffffff;
          --form-border: #1a1a1a;
        }
      `}</style>
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/anime_bg.png')", opacity: 0.8 }}
      />
      
      {/* Halftone / Manga Overlay */}
      <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay pointer-events-none" 
           style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "4px 4px" }} />

      <div className="relative z-10 h-full anime-theme-scope">
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
        "bg-white/90 backdrop-blur-md border-4 border-[var(--form-border)] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
        props.className
      )}
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)", // Slightly clipped corner for manga action feel
        ...props.style
      }}
    />
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-white text-[var(--form-text)] border-4 border-[var(--form-border)] px-4 py-3 text-xl transition-all focus:outline-none focus:translate-x-1 focus:-translate-y-1 focus:shadow-[4px_4px_0px_0px_rgba(255,77,133,1)] placeholder:text-[var(--form-muted)]",
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
        "w-full bg-white text-[var(--form-text)] border-4 border-[var(--form-border)] px-4 py-3 text-xl transition-all focus:outline-none focus:translate-x-1 focus:-translate-y-1 focus:shadow-[4px_4px_0px_0px_rgba(255,77,133,1)] placeholder:text-[var(--form-muted)] resize-y",
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
        "px-8 py-4 font-bold text-xl uppercase tracking-wider bg-[var(--form-primary)] text-[var(--form-primary-fg)] border-4 border-[var(--form-border)] transition-all hover:-translate-y-1 hover:translate-x-1 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[-8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:translate-x-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:pointer-events-none",
        props.className
      )}
      style={props.style ? { ...props.style, backgroundColor: props.style.backgroundColor || "var(--form-primary)", color: props.style.color || "var(--form-primary-fg)", border: "4px solid #1a1a1a" } : undefined}
    >
      {props.children}
    </button>
  );
}

export const AnimeThemeComponents: ThemeComponents = {
  ...BaseThemeComponents,
  Wrapper,
  Card,
  Input,
  Textarea,
  Button,
};
