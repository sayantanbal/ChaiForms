"use client";

import React from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { getThemeVariables, type ThemeKey } from "../../lib/themes";
import { ThemeContext } from "../../lib/theme-registry";

export const BaseThemeComponents = {
  Wrapper: function BaseWrapper({ children }: { children: React.ReactNode }) {
    const { name } = React.useContext(ThemeContext);
    const vars = getThemeVariables(name as ThemeKey) as React.CSSProperties;
    return (
      <div 
        className="relative min-h-screen w-full font-sans text-[var(--form-text)] bg-[var(--form-bg)] transition-colors duration-300"
        style={vars}
      >
        {children}
      </div>
    );
  },
  Background: function BaseBackground() {
    return <div className="absolute inset-0 z-0 pointer-events-none" />;
  },
  Input: function BaseInput(props: React.ComponentProps<"input">) {
    return <Input {...props} className={`bg-[var(--form-surface)] border-[var(--form-border)] text-[var(--form-text)] focus-visible:ring-[var(--form-primary)] ${props.className || ""}`} />;
  },
  Textarea: function BaseTextarea(props: React.ComponentProps<"textarea">) {
    return <Textarea {...props} className={`bg-[var(--form-surface)] border-[var(--form-border)] text-[var(--form-text)] focus-visible:ring-[var(--form-primary)] ${props.className || ""}`} />;
  },
  Button: function BaseButton(props: React.ComponentProps<"button">) {
    return <Button {...props} style={{ backgroundColor: "var(--form-primary)", color: "var(--form-primary-fg)" }} />;
  },
  Card: function BaseCard(props: React.ComponentProps<"div">) {
    return <Card {...props} className={`bg-[var(--form-surface)] border-[var(--form-border)] rounded-[var(--form-radius)] ${props.className || ""}`} />;
  },
};
