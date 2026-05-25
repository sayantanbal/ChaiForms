"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FieldSchemaUnion } from "@repo/schemas";
import { FieldCard } from "./field-card";
import { Plus } from "lucide-react";
import { ThemeProvider } from "~/lib/theme-registry";

interface FormCanvasProps {
  fields: FieldSchemaUnion[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onAddField: () => void;
  theme?: string | null;
}

export function FormCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onAddField,
  theme,
}: FormCanvasProps) {
  const { setNodeRef } = useDroppable({
    id: "form-canvas-droppable",
  });

  return (
    <ThemeProvider theme={theme}>
      <div
        ref={setNodeRef}
        className="h-full overflow-y-auto p-6 md:p-10 flex flex-col items-center"
      >
        <div className="w-full max-w-3xl flex flex-col gap-4 relative z-10">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl bg-card text-center">
              <h3 className="text-lg font-semibold mb-2 text-foreground">No fields yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Drag and drop fields from the palette on the left or click the button below to get
                started.
              </p>
              <button
                onClick={onAddField}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add First Field
              </button>
            </div>
          ) : (
            <>
              <SortableContext
                items={fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {fields.map((field) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      isSelected={selectedFieldId === field.id}
                      onSelect={onSelectField}
                      onDelete={onDeleteField}
                    />
                  ))}
                </div>
              </SortableContext>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={onAddField}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors shadow-sm font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Field
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
