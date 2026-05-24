"use client";

import React from "react";
import Link from "next/link";

interface ThankYouScreenProps {
  message?: string | null;
}

export function ThankYouScreen({ message }: ThankYouScreenProps) {
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-md w-full bg-[var(--form-surface)] p-8 sm:p-12 rounded-3xl shadow-xl border border-[var(--form-border)]">
        <div className="w-20 h-20 mx-auto bg-[var(--form-primary)]/10 text-[var(--form-primary)] rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[var(--form-text)] mb-4">
          Thank you!
        </h1>
        <p className="text-[var(--form-muted)] text-lg mb-8 leading-relaxed whitespace-pre-wrap">
          {message || "Your response has been recorded successfully. Thanks for taking the time to fill this out."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block font-semibold text-[var(--form-primary)] hover:text-[var(--form-primary-fg)] hover:bg-[var(--form-primary)] transition-all px-6 py-3 rounded-xl"
        >
          Submit another response
        </button>
      </div>
    </div>
  );
}
