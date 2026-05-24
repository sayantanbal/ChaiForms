"use client";

import React from "react";
import { FieldSchemaUnion } from "@repo/schemas";
import { getVisibleFields } from "@/lib/conditional-logic";
import { FieldRenderer } from "./field-renderers";
import { useThemeRegistry } from "~/lib/theme-registry";

interface FormPageProps {
  fields: FieldSchemaUnion[];
  answers: Record<string, any>;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstPage: boolean;
  isLastPage: boolean;
  isSubmitting?: boolean;
}

export function FormPage({
  fields,
  answers,
  errors,
  onChange,
  onNext,
  onBack,
  isFirstPage,
  isLastPage,
  isSubmitting
}: FormPageProps) {
  // Only render fields that pass their conditional rules based on CURRENT answers
  const visibleFields = getVisibleFields(fields, answers);
  const { components } = useThemeRegistry();

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col min-h-screen py-12 px-6">
      <components.Card className="flex-1 flex flex-col p-8 sm:p-12 mb-12 relative">
        <div className="flex-1 space-y-12">
          {visibleFields.map((field) => (
            <div key={field.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <FieldRenderer
                field={field}
                value={answers[field.id]}
                onChange={(value) => onChange(field.id, value)}
                error={errors[field.id]}
              />
            </div>
          ))}
          {visibleFields.length === 0 && (
            <div className="text-center text-[var(--form-muted)] italic py-12">
              No fields visible.
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-12 pt-6 border-t border-[var(--form-border)] sticky bottom-0 bg-[var(--form-surface)] z-10">
          {!isFirstPage && (
            <components.Button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--form-surface)", color: "var(--form-text)", border: "1px solid var(--form-border)" }}
            >
              Back
            </components.Button>
          )}
          
          <components.Button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="ml-auto px-8 py-3 rounded-lg font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {isLastPage ? "Submit" : "Next"}
          </components.Button>
        </div>
      </components.Card>
    </div>
  );
}
