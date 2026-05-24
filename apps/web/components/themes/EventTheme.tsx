import React from "react";
import { ThemeComponents } from "../../lib/theme-registry";
import { cn } from "../../lib/utils";
import { BaseThemeComponents } from "./BaseTheme";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{ fontFamily: "'Calgary DEMO', sans-serif" }}
    >
      <style>{`
        @font-face {
          font-family: 'Calgary DEMO';
          src: url('/fonts/calgarydemo/calgary-demo.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        .event-theme-scope {
          --form-bg: transparent;
          --form-surface: rgba(255, 245, 235, 0.85); /* Warm off-white */
          --form-text: #4a2b10;
          --form-muted: #8c6a50;
          --form-primary: #ff6b35; /* Vibrant sunset orange */
          --form-primary-fg: #ffffff;
          --form-border: rgba(255, 107, 53, 0.3);
        }
      `}</style>
      
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed scale-105"
        style={{ backgroundImage: "url('/images/event_bg.png')" }}
      />
      
      {/* Warm color overlay to ensure text contrast */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-orange-900/40 to-pink-900/40 backdrop-blur-md" />

      <div className="relative z-10 event-theme-scope text-[var(--form-text)]">
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
        "bg-[var(--form-surface)] backdrop-blur-xl border border-white/40 rounded-3xl p-8 sm:p-12 shadow-2xl",
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
        "w-full bg-white/50 text-[var(--form-text)] border-2 border-[var(--form-border)] rounded-full px-6 py-4 text-lg transition-all focus:outline-none focus:border-[var(--form-primary)] focus:bg-white placeholder:text-[var(--form-muted)]",
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
        "w-full bg-white/50 text-[var(--form-text)] border-2 border-[var(--form-border)] rounded-3xl px-6 py-4 text-lg transition-all focus:outline-none focus:border-[var(--form-primary)] focus:bg-white placeholder:text-[var(--form-muted)] resize-y min-h-[120px]",
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
        "px-10 py-4 rounded-full font-bold text-xl tracking-wide bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-[0_8px_20px_rgba(255,107,53,0.4)] transition-all hover:scale-105 hover:shadow-[0_12px_25px_rgba(255,107,53,0.6)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        props.className
      )}
      style={props.style ? { ...props.style, backgroundColor: undefined, color: undefined, border: undefined } : undefined}
    >
      {props.children}
    </button>
  );
}

export const EventThemeComponents: ThemeComponents = {
  ...BaseThemeComponents,
  Wrapper,
  Card,
  Input,
  Textarea,
  Button,
};
