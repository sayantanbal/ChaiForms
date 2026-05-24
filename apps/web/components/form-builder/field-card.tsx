"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FieldSchemaUnion } from "@repo/schemas";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldCardProps {
  field: FieldSchemaUnion;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function FieldCard({ field, isSelected, onSelect, onDelete }: FieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: "field",
      field,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(field.id)}
      className={cn(
        "group relative flex items-center gap-3 p-4 bg-card border rounded-lg shadow-sm cursor-pointer transition-all",
        isDragging ? "opacity-50 border-primary shadow-md z-10" : "border-border hover:border-primary/50",
        isSelected && "border-primary ring-1 ring-primary"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 -ml-2 text-muted-foreground hover:text-foreground active:cursor-grabbing rounded"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-card-foreground">
            {field.label || "Untitled Field"}
          </span>
          {field.required && <span className="text-destructive text-xs font-bold">*</span>}
        </div>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium bg-muted px-2 py-0.5 rounded-md self-start">
          {field.type.replace("_", " ")}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(field.id);
        }}
        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none"
        aria-label="Delete field"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
