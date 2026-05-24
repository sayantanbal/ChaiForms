"use client";

import React from "react";
import { FieldSchemaUnion } from "@repo/schemas";
import { Plus, Trash2, FolderTree } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface ConditionalRuleEditorProps {
  field: FieldSchemaUnion;
  allFields: FieldSchemaUnion[];
  onChange: (rules: any | undefined) => void;
}

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "greater_than_equal", label: "Greater than or equal" },
  { value: "less_than_equal", label: "Less than or equal" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
  { value: "in", label: "In" },
  { value: "not_in", label: "Not in" },
];

function RuleGroupRenderer({ 
  group, 
  precedingFields, 
  onChange, 
  onRemove,
  isRoot = false 
}: { 
  group: any; 
  precedingFields: FieldSchemaUnion[]; 
  onChange: (group: any) => void;
  onRemove?: () => void;
  isRoot?: boolean;
}) {
  const addRule = () => {
    if (precedingFields.length === 0) return;
    const newRule = {
      field: precedingFields[0]!.id,
      operator: "equals",
      value: ""
    };
    onChange({ ...group, rules: [...group.rules, newRule] });
  };

  const addGroup = () => {
    const newGroup = {
      combinator: "AND",
      rules: []
    };
    onChange({ ...group, rules: [...group.rules, newGroup] });
  };

  const updateChild = (index: number, childNode: any) => {
    const newRules = [...group.rules];
    newRules[index] = childNode;
    onChange({ ...group, rules: newRules });
  };

  const removeChild = (index: number) => {
    const newRules = [...group.rules];
    newRules.splice(index, 1);
    onChange({ ...group, rules: newRules });
  };

  return (
    <div className={`flex flex-col gap-3 rounded-md ${!isRoot ? "border border-border p-3 bg-muted/20" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={group.combinator}
            onChange={(e) => onChange({ ...group, combinator: e.target.value })}
            className="text-xs font-semibold p-1 rounded bg-background border border-border text-foreground"
          >
            <option value="AND">ALL of the following</option>
            <option value="OR">ANY of the following</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={addRule} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Rule
          </button>
          <button type="button" onClick={addGroup} className="text-xs text-secondary-foreground hover:text-secondary-foreground/80 flex items-center gap-1">
            <FolderTree className="w-3 h-3" /> Group
          </button>
          {!isRoot && onRemove && (
            <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {group.rules.length === 0 && (
        <div className="text-xs text-muted-foreground italic py-2">No rules added.</div>
      )}

      {group.rules.length > 0 && (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
          {group.rules.map((node: any, index: number) => {
            if ("combinator" in node) {
              return (
                <RuleGroupRenderer 
                  key={node.id || index}
                  group={node} 
                  precedingFields={precedingFields}
                  onChange={(updatedNode) => updateChild(index, updatedNode)}
                  onRemove={() => removeChild(index)}
                />
              );
            }

            const needsValue = !["is_empty", "is_not_empty"].includes(node.operator);
            const isArrayOp = ["in", "not_in"].includes(node.operator);

            return (
              <div key={node.id || index} className="flex gap-2 items-center bg-muted/50 p-2 rounded border border-border relative group/rule">
                <select
                  value={node.field}
                  onChange={(e) => updateChild(index, { ...node, field: e.target.value })}
                  className="flex-1 text-xs p-1.5 rounded bg-background border border-input"
                >
                  {precedingFields.map(pf => (
                    <option key={pf.id} value={pf.id}>{pf.label || "Untitled Field"}</option>
                  ))}
                </select>

                <select
                  value={node.operator}
                  onChange={(e) => {
                    const op = e.target.value;
                    const isNewArrayOp = ["in", "not_in"].includes(op);
                    const isOldArrayOp = ["in", "not_in"].includes(node.operator);
                    
                    let val = node.value;
                    if (isNewArrayOp && !isOldArrayOp) val = val ? [val] : [];
                    if (!isNewArrayOp && isOldArrayOp) val = Array.isArray(val) ? (val[0] || "") : "";
                    
                    updateChild(index, { ...node, operator: op, value: val });
                  }}
                  className="w-32 text-xs p-1.5 rounded bg-background border border-input"
                >
                  {OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {needsValue && (
                  <input
                    type="text"
                    placeholder={isArrayOp ? "value1, value2" : "Value"}
                    value={isArrayOp && Array.isArray(node.value) ? node.value.join(", ") : node.value || ""}
                    onChange={(e) => {
                      let val: any = e.target.value;
                      if (isArrayOp) {
                        val = val.split(",").map((s: string) => s.trim()).filter(Boolean);
                      }
                      updateChild(index, { ...node, value: val });
                    }}
                    className="flex-1 text-xs p-1.5 rounded bg-background border border-input"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/rule:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ConditionalRuleEditor({ field, allFields, onChange }: ConditionalRuleEditorProps) {
  const fieldIndex = allFields.findIndex(f => f.id === field.id);
  const precedingFields = fieldIndex > 0 ? allFields.slice(0, fieldIndex) : [];

  // Convert old flat array to new RuleGroup format if needed
  let rootGroup = field.conditionalRules;
  if (Array.isArray(rootGroup)) {
    rootGroup = {
      combinator: "AND",
      rules: rootGroup.map(r => ({
        field: r.sourceFieldId,
        operator: r.operator,
        value: r.value
      }))
    };
  }

  if (precedingFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md border">
        Conditional rules can only depend on fields that appear before this one.
      </div>
    );
  }

  if (!rootGroup) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium">Show this field if...</label>
        <p className="text-sm text-muted-foreground italic mb-2">Always visible</p>
        <button
          onClick={() => onChange({ combinator: "AND", rules: [] })}
          type="button"
          className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
        >
          <Plus className="w-3 h-3" /> Add Conditional Rules
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Show this field if...</label>
        <button
          onClick={() => onChange(undefined)}
          type="button"
          className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Remove All Rules
        </button>
      </div>

      <RuleGroupRenderer 
        group={rootGroup} 
        precedingFields={precedingFields} 
        onChange={onChange}
        isRoot={true}
      />
    </div>
  );
}
