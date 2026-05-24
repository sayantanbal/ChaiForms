"use client";

import React from "react";
import { FieldSchemaUnion } from "@repo/schemas";
import { ConditionalRuleEditor } from "./conditional-rule-editor";
import { Plus, Trash2 } from "lucide-react";

interface FieldConfigPanelProps {
  field: FieldSchemaUnion | null;
  allFields: FieldSchemaUnion[];
  onChange: (field: FieldSchemaUnion) => void;
}

export function FieldConfigPanel({ field, allFields, onChange }: FieldConfigPanelProps) {
  if (!field) {
    return (
      <div className="h-full p-6 text-center text-muted-foreground flex flex-col items-center justify-center border-l border-border bg-background">
        <p>Select a field to configure its settings</p>
      </div>
    );
  }

  const updateField = (updates: Partial<FieldSchemaUnion>) => {
    // @ts-expect-error - we trust the updates match the union variant
    onChange({ ...field, ...updates });
  };

  const renderTypeSpecificSettings = () => {
    switch (field.type) {
      case "single_select":
      case "multi_select":
        return (
          <div className="space-y-3 pt-4 border-t border-border">
            <label className="text-sm font-medium">Options</label>
            <div className="space-y-2">
              {field.options?.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={typeof opt === 'string' ? opt : opt.label}
                    onChange={(e) => {
                      const newOpts = [...(field.options || [])];
                      if (typeof newOpts[i] === 'string') {
                        newOpts[i] = e.target.value;
                      } else {
                        newOpts[i] = { ...(newOpts[i] as any), label: e.target.value, value: e.target.value };
                      }
                      updateField({ options: newOpts });
                    }}
                    className="flex-1 text-sm p-2 rounded-md border border-input bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newOpts = [...(field.options || [])];
                      newOpts.splice(i, 1);
                      updateField({ options: newOpts });
                    }}
                    disabled={(field.options?.length || 0) <= 2}
                    className="p-2 text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newOpts = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                  updateField({ options: newOpts });
                }}
                className="text-sm flex items-center gap-1 text-primary hover:text-primary/80 mt-2"
              >
                <Plus className="w-4 h-4" /> Add Option
              </button>
            </div>
          </div>
        );
      case "rating":
        return (
          <div className="space-y-3 pt-4 border-t border-border">
            <label className="text-sm font-medium">Max Rating (2-10)</label>
            <input
              type="number"
              min={2}
              max={10}
              value={field.maxRating || 5}
              onChange={(e) => updateField({ maxRating: parseInt(e.target.value) || 5 })}
              className="w-full text-sm p-2 rounded-md border border-input bg-background"
            />
          </div>
        );
      case "short_text":
      case "long_text":
        return (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Min Length</label>
                <input
                  type="number"
                  min={0}
                  value={field.minLength || ""}
                  onChange={(e) => updateField({ minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full text-sm p-2 rounded-md border border-input bg-background"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Max Length</label>
                <input
                  type="number"
                  min={1}
                  value={field.maxLength || ""}
                  onChange={(e) => updateField({ maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full text-sm p-2 rounded-md border border-input bg-background"
                />
              </div>
            </div>
            {field.type === "short_text" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Validation Regex</label>
                <input
                  type="text"
                  placeholder="^pattern$"
                  value={field.validationRegex || ""}
                  onChange={(e) => updateField({ validationRegex: e.target.value || undefined })}
                  className="w-full text-sm p-2 rounded-md border border-input bg-background font-mono"
                />
              </div>
            )}
          </div>
        );
      case "number":
        return (
          <div className="flex gap-4 pt-4 border-t border-border">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Min Value</label>
              <input
                type="number"
                value={field.min ?? ""}
                onChange={(e) => updateField({ min: e.target.value !== "" ? parseFloat(e.target.value) : undefined })}
                className="w-full text-sm p-2 rounded-md border border-input bg-background"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Max Value</label>
              <input
                type="number"
                value={field.max ?? ""}
                onChange={(e) => updateField({ max: e.target.value !== "" ? parseFloat(e.target.value) : undefined })}
                className="w-full text-sm p-2 rounded-md border border-input bg-background"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto border-l border-border bg-background p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Field Settings</h3>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium bg-muted px-2 py-0.5 rounded-md">
          {field.type.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Question / Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => updateField({ label: e.target.value })}
            className="w-full text-sm p-2 rounded-md border border-input bg-background"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="required-toggle"
            checked={field.required || false}
            onChange={(e) => updateField({ required: e.target.checked })}
            className="w-4 h-4 rounded border-input"
          />
          <label htmlFor="required-toggle" className="text-sm font-medium cursor-pointer">
            Required field
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            value={field.description || ""}
            onChange={(e) => updateField({ description: e.target.value })}
            rows={2}
            className="w-full text-sm p-2 rounded-md border border-input bg-background resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Placeholder (optional)</label>
          <input
            type="text"
            value={field.placeholder || ""}
            onChange={(e) => updateField({ placeholder: e.target.value })}
            className="w-full text-sm p-2 rounded-md border border-input bg-background"
          />
        </div>
      </div>

      {renderTypeSpecificSettings()}

      <div className="pt-4 border-t border-border">
        <ConditionalRuleEditor 
          field={field} 
          allFields={allFields} 
          onChange={(rules) => updateField({ conditionalRules: rules })}
        />
      </div>
    </div>
  );
}
