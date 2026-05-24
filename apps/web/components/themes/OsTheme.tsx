"use client";

import React from "react";
import { getThemeVariables, type ThemeKey } from "../../lib/themes";
import { ThemeContext } from "../../lib/theme-registry";
import { cn } from "../../lib/utils";

export const OsThemeComponents = {
  Wrapper: function OsWrapper({ children }: { children: React.ReactNode }) {
    const { name } = React.useContext(ThemeContext);
    const vars = getThemeVariables(name as ThemeKey) as React.CSSProperties;
    return (
      <div 
        className="relative min-h-screen w-full text-[var(--form-text)] bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ 
          ...vars, 
          fontFamily: "'Tahoma', 'MS Sans Serif', sans-serif",
          backgroundImage: "url('/images/winxp_bliss.png')"
        }}
      >
        <style>{`
          @font-face {
            font-family: 'Tahoma';
            src: url('/fonts/tahoma/tahoma.otf') format('opentype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
        <div className="mx-auto max-w-2xl px-4 py-8 relative z-10">
          {children}
        </div>
      </div>
    );
  },
  Background: function OsBackground() {
    return null;
  },
  Input: function OsInput(props: React.ComponentProps<"input">) {
    return (
      <input 
        {...props} 
        className={cn(
          "w-full bg-white px-2 py-1 text-sm border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white focus:outline-none focus:bg-blue-50",
          props.className
        )} 
      />
    );
  },
  Textarea: function OsTextarea(props: React.ComponentProps<"textarea">) {
    return (
      <textarea 
        {...props} 
        className={cn(
          "w-full bg-white px-2 py-1 text-sm border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white focus:outline-none focus:bg-blue-50 min-h-[100px] resize-y",
          props.className
        )} 
      />
    );
  },
  Button: function OsButton(props: React.ComponentProps<"button">) {
    return (
      <button 
        {...props} 
        className={cn(
          "inline-flex items-center justify-center px-4 py-1 text-sm bg-gray-200 border-2 border-t-white border-l-white border-b-gray-600 border-r-gray-600 active:border-t-gray-600 active:border-l-gray-600 active:border-b-white active:border-r-white active:pt-[5px] active:pl-[5px] active:pb-[3px] active:pr-[3px] disabled:opacity-50",
          props.className
        )}
        style={{ color: "var(--form-text)" }}
      >
        {props.children}
      </button>
    );
  },
  Card: function OsCard(props: React.ComponentProps<"div">) {
    return (
      <div 
        {...props} 
        className={cn(
          "bg-[#ece9d8]/90 backdrop-blur-md border border-[#00138c] rounded-t-lg shadow-xl flex flex-col overflow-hidden",
          props.className
        )} 
      >
        <div className="bg-gradient-to-r from-[#0058e6] via-[#3a93ff] to-[#0058e6] text-white px-3 py-1.5 text-sm font-bold flex items-center justify-between shadow-sm">
          <span style={{ textShadow: "1px 1px 1px rgba(0,0,0,0.5)" }}>Form_Application.exe</span>
          <div className="flex gap-1">
            <button className="w-5 h-5 bg-[#3a93ff] hover:bg-[#5bb0ff] border border-white text-white rounded-[2px] flex items-center justify-center text-[10px] shadow-sm font-bold">_</button>
            <button className="w-5 h-5 bg-[#3a93ff] hover:bg-[#5bb0ff] border border-white text-white rounded-[2px] flex items-center justify-center text-[10px] shadow-sm font-bold">□</button>
            <button className="w-5 h-5 bg-[#e81123] hover:bg-[#ff5555] border border-white text-white rounded-[2px] flex items-center justify-center text-[10px] shadow-sm font-bold">X</button>
          </div>
        </div>
        <div className="p-6">
          {props.children}
        </div>
      </div>
    );
  },
};
