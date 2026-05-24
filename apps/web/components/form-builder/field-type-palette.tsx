"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { FieldType } from "@repo/schemas";
import { 
  Type, 
  AlignLeft, 
  Mail, 
  Hash, 
  List, 
  ListChecks, 
  CheckSquare, 
  Star, 
  Calendar 
} from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "short_text", label: "Short Text", icon: <Type className="w-4 h-4" /> },
  { type: "long_text", label: "Long Text", icon: <AlignLeft className="w-4 h-4" /> },
  { type: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
  { type: "number", label: "Number", icon: <Hash className="w-4 h-4" /> },
  { type: "single_select", label: "Single Select", icon: <List className="w-4 h-4" /> },
  { type: "multi_select", label: "Multi Select", icon: <ListChecks className="w-4 h-4" /> },
  { type: "checkbox", label: "Checkbox", icon: <CheckSquare className="w-4 h-4" /> },
  { type: "rating", label: "Rating", icon: <Star className="w-4 h-4" /> },
  { type: "date", label: "Date", icon: <Calendar className="w-4 h-4" /> },
];

function DraggableFieldType({ type, label, icon, onAdd }: { type: FieldType; label: string; icon: React.ReactNode; onAdd: (type: FieldType) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `palette-${type}`,
    data: {
      type: "field-type",
      fieldType: type,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(type)}
      className="flex items-center gap-3 p-3 mb-2 rounded-md border border-border bg-card text-card-foreground shadow-sm cursor-grab hover:border-primary hover:bg-accent transition-colors"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function FieldTypePalette({ onAddField }: { onAddField: (type: FieldType) => void }) {
  return (
    <div className="p-4 h-full overflow-y-auto border-r border-border bg-background">
      <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Field Types</h3>
      <div className="flex flex-col gap-1">
        {FIELD_TYPES.map((field) => (
          <DraggableFieldType
            key={field.type}
            type={field.type}
            label={field.label}
            icon={field.icon}
            onAdd={onAddField}
          />
        ))}
      </div>
    </div>
  );
}
