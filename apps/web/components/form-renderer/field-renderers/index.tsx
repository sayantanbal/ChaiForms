import React from "react";
import { FieldSchemaUnion } from "@repo/schemas";
import { cn } from "@/lib/utils";
import { useThemeRegistry } from "~/lib/theme-registry";

interface FieldRendererProps {
  field: FieldSchemaUnion;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

function FieldLabel({ field }: { field: FieldSchemaUnion }) {
  return (
    <div className="mb-2">
      <label
        htmlFor={field.id}
        className="block text-[var(--form-text)] font-semibold text-base sm:text-lg"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={`${field.id}-desc`} className="text-[var(--form-muted)] text-sm mt-1">
          {field.description}
        </p>
      )}
    </div>
  );
}

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="text-red-500 text-sm mt-1.5 font-medium animate-in slide-in-from-top-1">
      {error}
    </p>
  );
}

export function ShortTextField({ field, value, onChange, error }: FieldRendererProps) {
  const { components } = useThemeRegistry();
  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <components.Input
        id={field.id}
        type="text"
        value={value || ""}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={field.placeholder || "Type your answer here..."}
        aria-describedby={`${field.id}-desc ${field.id}-error`}
        aria-invalid={!!error}
        aria-required={field.required}
        className={cn(
          "w-full bg-[var(--form-surface)] text-[var(--form-text)] border-b-2 px-0 py-3 text-lg sm:text-xl transition-colors focus:outline-none placeholder:text-[var(--form-muted)]",
          error ? "border-red-500" : "border-[var(--form-border)] focus:border-[var(--form-primary)]"
        )}
      />
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function LongTextField({ field, value, onChange, error }: FieldRendererProps) {
  const { components } = useThemeRegistry();
  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <components.Textarea
        id={field.id}
        value={value || ""}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={field.placeholder || "Type your answer here..."}
        rows={4}
        aria-describedby={`${field.id}-desc ${field.id}-error`}
        aria-invalid={!!error}
        aria-required={field.required}
        className={cn(
          "w-full bg-[var(--form-surface)] text-[var(--form-text)] border-b-2 px-0 py-3 text-lg sm:text-xl transition-colors focus:outline-none placeholder:text-[var(--form-muted)] resize-y",
          error ? "border-red-500" : "border-[var(--form-border)] focus:border-[var(--form-primary)]"
        )}
      />
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function EmailField({ field, value, onChange, error }: FieldRendererProps) {
  const { components } = useThemeRegistry();
  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <components.Input
        id={field.id}
        type="email"
        value={value || ""}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={field.placeholder || "name@example.com"}
        aria-describedby={`${field.id}-desc ${field.id}-error`}
        aria-invalid={!!error}
        aria-required={field.required}
        className={cn(
          "w-full bg-[var(--form-surface)] text-[var(--form-text)] border-b-2 px-0 py-3 text-lg sm:text-xl transition-colors focus:outline-none placeholder:text-[var(--form-muted)]",
          error ? "border-red-500" : "border-[var(--form-border)] focus:border-[var(--form-primary)]"
        )}
      />
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function NumberField({ field, value, onChange, error }: FieldRendererProps) {
  const { components } = useThemeRegistry();
  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <components.Input
        id={field.id}
        type="number"
        value={value ?? ""}
        onChange={(e: any) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        placeholder={field.placeholder || "0"}
        aria-describedby={`${field.id}-desc ${field.id}-error`}
        aria-invalid={!!error}
        aria-required={field.required}
        className={cn(
          "w-full bg-[var(--form-surface)] text-[var(--form-text)] border-b-2 px-0 py-3 text-lg sm:text-xl transition-colors focus:outline-none placeholder:text-[var(--form-muted)]",
          error ? "border-red-500" : "border-[var(--form-border)] focus:border-[var(--form-primary)]"
        )}
      />
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function SingleSelectField({ field, value, onChange, error }: FieldRendererProps) {
  const options = (field as any).options || [];
  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <div className="flex flex-col gap-2 mt-3" role="radiogroup" aria-required={field.required}>
        {options.map((opt: string, i: number) => {
          const isSelected = value === opt;
          return (
            <label
              key={i}
              className={cn(
                "flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all",
                isSelected
                  ? "border-[var(--form-primary)] bg-[var(--form-primary)]/10 text-[var(--form-primary-fg)]"
                  : "border-[var(--form-border)] bg-[var(--form-surface)] text-[var(--form-text)] hover:border-[var(--form-primary)]/50"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                  isSelected ? "border-[var(--form-primary)]" : "border-[var(--form-border)]"
                )}
              >
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--form-primary)]" />}
              </div>
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={isSelected}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
              <span className="text-base sm:text-lg font-medium">{opt}</span>
            </label>
          );
        })}
      </div>
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function MultiSelectField({ field, value, onChange, error }: FieldRendererProps) {
  const options = (field as any).options || [];
  const selectedValues = Array.isArray(value) ? value : [];

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter(v => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <div className="flex flex-col gap-2 mt-3" role="group" aria-required={field.required}>
        {options.map((opt: string, i: number) => {
          const isSelected = selectedValues.includes(opt);
          return (
            <label
              key={i}
              className={cn(
                "flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all",
                isSelected
                  ? "border-[var(--form-primary)] bg-[var(--form-primary)]/10 text-[var(--form-primary-fg)]"
                  : "border-[var(--form-border)] bg-[var(--form-surface)] text-[var(--form-text)] hover:border-[var(--form-primary)]/50"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                  isSelected ? "border-[var(--form-primary)] bg-[var(--form-primary)]" : "border-[var(--form-border)]"
                )}
              >
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                name={field.id}
                value={opt}
                checked={isSelected}
                onChange={() => toggleOption(opt)}
                className="sr-only"
              />
              <span className="text-base sm:text-lg font-medium">{opt}</span>
            </label>
          );
        })}
      </div>
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function CheckboxField({ field, value, onChange, error }: FieldRendererProps) {
  return (
    <div className="w-full">
      <label
        className="flex items-start gap-3 cursor-pointer group"
      >
        <div
          className={cn(
            "w-6 h-6 mt-0.5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
            value ? "border-[var(--form-primary)] bg-[var(--form-primary)]" : "border-[var(--form-border)] group-hover:border-[var(--form-primary)]/50"
          )}
        >
          {value && (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <input
          id={field.id}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
          aria-describedby={`${field.id}-desc ${field.id}-error`}
          aria-invalid={!!error}
          aria-required={field.required}
        />
        <div className="flex-1">
          <span className="text-[var(--form-text)] font-semibold text-base sm:text-lg leading-tight block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </span>
          {field.description && (
            <p id={`${field.id}-desc`} className="text-[var(--form-muted)] text-sm mt-1">
              {field.description}
            </p>
          )}
        </div>
      </label>
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function RatingField({ field, value, onChange, error }: FieldRendererProps) {
  const maxRating = (field as any).maxRating || 5;
  const stars = Array.from({ length: maxRating }, (_, i) => i + 1);
  
  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-2 sm:gap-4 mt-4" role="radiogroup" aria-required={field.required}>
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={cn(
              "w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl transition-all shadow-sm border-2",
              value === star
                ? "bg-[var(--form-primary)] text-white border-[var(--form-primary)] scale-110 shadow-md"
                : "bg-[var(--form-surface)] text-[var(--form-text)] border-[var(--form-border)] hover:border-[var(--form-primary)] hover:text-[var(--form-primary)] hover:bg-[var(--form-primary)]/5"
            )}
            aria-label={`Rate ${star} out of ${maxRating}`}
            aria-pressed={value === star}
          >
            {star}
          </button>
        ))}
      </div>
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function DateField({ field, value, onChange, error }: FieldRendererProps) {
  const { components } = useThemeRegistry();
  return (
    <div className="w-full">
      <FieldLabel field={field} />
      <components.Input
        id={field.id}
        type="date"
        value={value || ""}
        onChange={(e: any) => onChange(e.target.value)}
        aria-describedby={`${field.id}-desc ${field.id}-error`}
        aria-invalid={!!error}
        aria-required={field.required}
        className={cn(
          "w-full bg-[var(--form-surface)] text-[var(--form-text)] border-b-2 px-0 py-3 text-lg sm:text-xl transition-colors focus:outline-none",
          error ? "border-red-500" : "border-[var(--form-border)] focus:border-[var(--form-primary)]"
        )}
      />
      <FieldError error={error} id={field.id} />
    </div>
  );
}

export function FieldRenderer({ field, ...props }: FieldRendererProps) {
  switch (field.type) {
    case "short_text": return <ShortTextField field={field} {...props} />;
    case "long_text": return <LongTextField field={field} {...props} />;
    case "email": return <EmailField field={field} {...props} />;
    case "number": return <NumberField field={field} {...props} />;
    case "single_select": return <SingleSelectField field={field} {...props} />;
    case "multi_select": return <MultiSelectField field={field} {...props} />;
    case "checkbox": return <CheckboxField field={field} {...props} />;
    case "rating": return <RatingField field={field} {...props} />;
    case "date": return <DateField field={field} {...props} />;
    default: return <p className="text-red-500">Unknown field type</p>;
  }
}
