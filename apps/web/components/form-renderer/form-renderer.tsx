"use client";

import React, { useState } from "react";
import { FieldSchemaUnion } from "@repo/schemas";
import { trpc } from "~/trpc/client";
import { FormPage } from "./form-page";
import { ThankYouScreen } from "./thank-you-screen";
import { getVisibleFields } from "~/lib/conditional-logic";

interface FormRendererProps {
  formId: string;
  fields: FieldSchemaUnion[];
  pages?: { id: string; fieldIds: string[] }[];
  thankyouMessage?: string | null;
  unlockToken?: string;
}

export function FormRenderer({
  formId,
  fields,
  pages,
  thankyouMessage,
  unlockToken
}: FormRendererProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Derive pages from the array or treat all fields as one page
  const pageLayout = pages && pages.length > 0 
    ? pages 
    : [{ id: "default", fieldIds: fields.map(f => f.id) }];

  const currentFieldIds = pageLayout[pageIndex]?.fieldIds || [];
  const currentFields = fields.filter(f => currentFieldIds.includes(f.id));

  const submitMutation = trpc.responses.submit.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error) => {
      // Map TRPC field errors if they exist
      if (error.data?.code === "BAD_REQUEST" && error.message.includes("validation")) {
        // Simple fallback parsing for now since TRPC errors can be complex
        const newErrors: Record<string, string> = {};
        // If error message format is known, parse it here. Otherwise just show top level.
        // E.g. Zod error might come through. We'll set a generic error on required missing.
        
        // For now, let's just do client-side validation as the primary guard
        setErrors({ "submit": error.message });
      } else {
        setErrors({ "submit": error.message });
      }
    }
  });

  const validateCurrentPage = () => {
    const visibleFields = getVisibleFields(currentFields, answers);
    const newErrors: Record<string, string> = {};
    let isValid = true;

    visibleFields.forEach((field) => {
      const val = answers[field.id];
      const isEmpty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
      
      if (field.required && isEmpty) {
        newErrors[field.id] = "This field is required";
        isValid = false;
        return;
      }

      if (!isEmpty) {
        if (field.type === "short_text" || field.type === "long_text") {
          const str = String(val);
          const minLen = (field as any).minLength;
          const maxLen = (field as any).maxLength;
          const regexStr = (field as any).validationRegex;

          if (minLen !== undefined && str.length < minLen) {
            newErrors[field.id] = `Must be at least ${minLen} characters`;
            isValid = false;
          }
          if (maxLen !== undefined && str.length > maxLen) {
            newErrors[field.id] = `Must be at most ${maxLen} characters`;
            isValid = false;
          }
          if (regexStr) {
            try {
              const regex = new RegExp(regexStr);
              if (!regex.test(str)) {
                newErrors[field.id] = "Invalid format";
                isValid = false;
              }
            } catch (e) {
              // Ignore bad regex
            }
          }
        } else if (field.type === "number") {
          const num = Number(val);
          const min = (field as any).min;
          const max = (field as any).max;
          if (min !== undefined && num < min) {
            newErrors[field.id] = `Must be at least ${min}`;
            isValid = false;
          }
          if (max !== undefined && num > max) {
            newErrors[field.id] = `Must be at most ${max}`;
            isValid = false;
          }
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateCurrentPage()) {
      if (pageIndex < pageLayout.length - 1) {
        setPageIndex(pageIndex + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Final Submit
        // Collect all visible fields from all pages (or just submit everything and let backend filter)
        // Best practice: Only submit visible fields
        const allVisibleFields = getVisibleFields(fields, answers);
        const finalAnswers = allVisibleFields
          .filter(f => answers[f.id] !== undefined && answers[f.id] !== null && answers[f.id] !== "")
          .map(f => {
            const raw = answers[f.id];
            // Serialize arrays (multi_select) as JSON strings for backend text column
            const value = Array.isArray(raw) ? JSON.stringify(raw) : String(raw);
            return { fieldId: f.id, value };
          });

        submitMutation.mutate({
          formId,
          unlockToken,
          answers: finalAnswers
        });
      }
    }
  };

  const handleBack = () => {
    if (pageIndex > 0) {
      setPageIndex(pageIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isSubmitted) {
    return <ThankYouScreen message={thankyouMessage} />;
  }

  return (
    <div className="w-full">
      {errors["submit"] && (
        <div className="max-w-3xl mx-auto mt-8 p-4 bg-red-100 text-red-900 border border-red-200 rounded-lg">
          {errors["submit"]}
        </div>
      )}
      <FormPage
        fields={currentFields}
        answers={answers}
        errors={errors}
        onChange={(fieldId, value) => {
          setAnswers(prev => ({ ...prev, [fieldId]: value }));
          // Clear error when user types
          if (errors[fieldId]) {
            setErrors(prev => {
              const next = { ...prev };
              delete next[fieldId];
              return next;
            });
          }
        }}
        onNext={handleNext}
        onBack={handleBack}
        isFirstPage={pageIndex === 0}
        isLastPage={pageIndex === pageLayout.length - 1}
        isSubmitting={submitMutation.isPending}
      />
    </div>
  );
}
