"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { FieldSchemaUnion, FormSettingsSchema } from "@repo/schemas";
import { trpc } from "@repo/trpc/client";
import { useFormAutosave } from "@/hooks/use-form-autosave";
import { FieldTypePalette } from "@/components/form-builder/field-type-palette";
import { FormCanvas } from "@/components/form-builder/form-canvas";
import { FieldConfigPanel } from "@/components/form-builder/field-config-panel";
import { ThemePicker } from "@/components/form-builder/theme-picker";
import { SettingsPanel } from "@/components/form-builder/settings-panel";
import { Eye, Share2, Globe, Save, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { arrayMove } from "@dnd-kit/sortable";

export function FormBuilderClient({ initialForm }: { initialForm: any }) {
  const [fields, setFields] = useState<FieldSchemaUnion[]>(initialForm.fields || []);
  const [settings, setSettings] = useState<Partial<FormSettingsSchema>>({
    title: initialForm.title,
    theme: initialForm.theme,
    visibility: initialForm.visibility,
    slug: initialForm.slug,
    expiryDate: initialForm.expiryDate,
    responseLimit: initialForm.responseLimit,
    thankyouMessage: initialForm.thankyouMessage,
    sendRespondentConfirmation: initialForm.sendRespondentConfirmation,
    accessPassword: initialForm.accessPasswordHash ? "******" : null, // Not exact, but for UI
  });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"field" | "theme" | "settings">("field");

  const { debouncedSave, saveState } = useFormAutosave(initialForm.id);

  const updateFormMutation = trpc.forms.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
    },
    onError: (e) => {
      toast.error(e.message || "Failed to update settings");
    }
  });

  const publishMutation = trpc.forms.publish.useMutation({
    onSuccess: () => {
      toast.success("Form published!");
      window.location.reload();
    }
  });

  const unpublishMutation = trpc.forms.unpublish.useMutation({
    onSuccess: () => {
      toast.success("Form unpublished!");
      window.location.reload();
    }
  });

  const handleAddField = (type: any) => {
    const newField = {
      id: uuidv4(),
      type,
      label: "New " + type.replace("_", " "),
      required: false,
    } as FieldSchemaUnion;
    
    if (type === "single_select" || type === "multi_select") {
      (newField as any).options = ["Option 1", "Option 2"];
    } else if (type === "rating") {
      (newField as any).maxRating = 5;
    }

    const newFields = [...fields, newField];
    setFields(newFields);
    setSelectedFieldId(newField.id);
    setActiveTab("field");
    debouncedSave(newFields);
  };

  const handleUpdateField = (updatedField: FieldSchemaUnion) => {
    const newFields = fields.map(f => f.id === updatedField.id ? updatedField : f);
    setFields(newFields);
    debouncedSave(newFields);
  };

  const handleDeleteField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    if (selectedFieldId === id) setSelectedFieldId(null);
    debouncedSave(newFields);
  };

  const handleReorderFields = (activeId: string, overId: string) => {
    const oldIndex = fields.findIndex(f => f.id === activeId);
    const newIndex = fields.findIndex(f => f.id === overId);
    const newFields = arrayMove(fields, oldIndex, newIndex);
    setFields(newFields);
    debouncedSave(newFields);
  };

  const handleUpdateSettings = (updates: Partial<FormSettingsSchema>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    updateFormMutation.mutate({ formId: initialForm.id, ...updates });
  };

  const isPublished = initialForm.status === "published";
  const estimatedTime = Math.max(1, Math.ceil(fields.length * 0.5));

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={settings.title || ""}
            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
            onBlur={() => handleUpdateSettings({ title: settings.title })}
            className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-2 ring-primary/20 rounded px-1"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
            {saveState === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
            {saveState === "saved" && <><Save className="w-3 h-3" /> Saved</>}
            {saveState === "idle" && <span className="opacity-70">All changes saved</span>}
            {saveState === "error" && <span className="text-destructive">Error saving</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground mr-2">
            {fields.length} fields • ~{estimatedTime} min to complete
          </span>
          <Link
            href={`/dashboard/forms/${initialForm.id}/preview`}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Preview"
          >
            <Eye className="w-5 h-5" />
          </Link>
          <button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
          
          {isPublished ? (
            <button
              onClick={() => unpublishMutation.mutate({ formId: initialForm.id })}
              className="px-4 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-accent transition-colors"
              disabled={unpublishMutation.isPending}
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => {
                if (fields.length === 0) {
                  toast.error("Add at least one field to publish");
                  return;
                }
                publishMutation.mutate({ formId: initialForm.id });
              }}
              className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              disabled={publishMutation.isPending}
            >
              <Globe className="w-4 h-4" /> Publish
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Left Panel: Field Palette */}
        <Panel defaultSize={20} minSize={15} maxSize={30}>
          <FieldTypePalette onAddField={handleAddField} />
        </Panel>
        
        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors" />
        
        {/* Center Panel: Canvas */}
        <Panel defaultSize={55} minSize={40}>
          <FormCanvas
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onDeleteField={handleDeleteField}
            onReorderFields={handleReorderFields}
            onAddField={() => handleAddField("short_text")}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors" />
        
        {/* Right Panel: Configuration */}
        <Panel defaultSize={25} minSize={20} maxSize={40} className="flex flex-col bg-background">
          <div className="flex border-b border-border p-2 gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("field")}
              className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${activeTab === "field" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Field
            </button>
            <button
              onClick={() => setActiveTab("theme")}
              className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${activeTab === "theme" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Theme
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-colors ${activeTab === "settings" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Settings
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {activeTab === "field" && (
              <FieldConfigPanel
                field={fields.find(f => f.id === selectedFieldId) || null}
                allFields={fields}
                onChange={handleUpdateField}
              />
            )}
            {activeTab === "theme" && (
              <div className="p-6 h-full overflow-y-auto">
                <ThemePicker
                  currentTheme={settings.theme || "default"}
                  onSelectTheme={(theme) => handleUpdateSettings({ theme })}
                />
              </div>
            )}
            {activeTab === "settings" && (
              <div className="p-6 h-full overflow-y-auto">
                <SettingsPanel
                  settings={settings}
                  onUpdate={handleUpdateSettings}
                />
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
