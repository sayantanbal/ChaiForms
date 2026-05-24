"use client";

import React from "react";
import { FieldSchemaUnion } from "@repo/schemas";
import { Plus, Trash2 } from "lucide-react";

interface ConditionalRuleEditorProps {
  field: FieldSchemaUnion;
  allFields: FieldSchemaUnion[];
  onChange: (rules: any[] | undefined) => void;
}

export function ConditionalRuleEditor({ field, allFields, onChange }: ConditionalRuleEditorProps) {
  // Find fields that appear before this one to use as condition sources
  const fieldIndex = allFields.findIndex(f => f.id === field.id);
  const precedingFields = fieldIndex > 0 ? allFields.slice(0, fieldIndex) : [];

  const rules = field.conditionalRules || [];

  const addRule = () => {
    const firstPrecedingField = precedingFields[0];
    if (!firstPrecedingField) return;
    const newRule = {
      sourceFieldId: firstPrecedingField.id,
      operator: "equals" as const,
      value: ""
    };
    onChange([...rules, newRule]);
  };

  const removeRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    onChange(newRules.length > 0 ? newRules : undefined);
  };

  const updateRule = (index: number, updates: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    onChange(newRules);
  };

  if (precedingFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md border">
        Conditional rules can only depend on fields that appear before this one.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Show this field if...</label>
        <button
          onClick={addRule}
          type="button"
          className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
        >
          <Plus className="w-3 h-3" /> Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Always visible</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const needsValue = !["is_empty", "is_not_empty"].includes(rule.operator);
            return (
              <div key={index} className="flex flex-col gap-2 p-3 bg-muted/50 rounded-md border border-border relative group">
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <select
                  value={rule.sourceFieldId}
                  onChange={(e) => updateRule(index, { sourceFieldId: e.target.value })}
                  className="w-full text-sm p-1.5 rounded-md border border-input bg-background pr-8"
                >
                  {precedingFields.map(pf => (
                    <option key={pf.id} value={pf.id}>{pf.label || "Untitled Field"}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(index, { operator: e.target.value })}
                    className="flex-1 text-sm p-1.5 rounded-md border border-input bg-background"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Does not equal</option>
                    <option value="contains">Contains</option>
                    <option value="is_empty">Is empty</option>
                    <option value="is_not_empty">Is not empty</option>
                  </select>

                  {needsValue && (
                    <input
                      type="text"
                      placeholder="Value"
                      value={rule.value || ""}
                      onChange={(e) => updateRule(index, { value: e.target.value })}
                      className="flex-1 text-sm p-1.5 rounded-md border border-input bg-background"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
