"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import type { FieldSchemaUnion } from "@repo/schemas";
import { THEME_PICKER_OPTIONS } from "~/lib/themes";

const FIELD_TYPES: { type: FieldSchemaUnion["type"]; label: string; icon: string }[] = [
  { type: "short_text", label: "Short Text", icon: "Aa" },
  { type: "long_text", label: "Long Text", icon: "¶" },
  { type: "email", label: "Email", icon: "@" },
  { type: "number", label: "Number", icon: "#" },
  { type: "single_select", label: "Single Select", icon: "◉" },
  { type: "multi_select", label: "Multi Select", icon: "☑" },
  { type: "checkbox", label: "Checkbox", icon: "✓" },
  { type: "rating", label: "Rating", icon: "★" },
  { type: "date", label: "Date", icon: "📅" },
];

function createField(type: FieldSchemaUnion["type"]): FieldSchemaUnion {
  const base = { id: uuidv4(), label: `New ${type.replace("_", " ")} field`, required: false };
  switch (type) {
    case "single_select":
    case "multi_select":
      return { ...base, type, options: ["Option 1", "Option 2"] };
    case "rating":
      return { ...base, type, maxRating: 5 };
    case "short_text":
      return { ...base, type };
    case "long_text":
      return { ...base, type };
    case "email":
      return { ...base, type };
    case "number":
      return { ...base, type };
    case "checkbox":
      return { ...base, type };
    case "date":
      return { ...base, type };
    default:
      return { ...base, type: "short_text" as const };
  }
}

export default function FormBuilderPage() {
  const { formId } = useParams<{ formId: string }>();
  const router = useRouter();

  const { data: form, isLoading, refetch } = trpc.forms.getById.useQuery({ formId });

  const [fields, setFields] = useState<FieldSchemaUnion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [tab, setTab] = useState<"fields" | "theme" | "settings">("fields");

  useEffect(() => {
    if (form) {
      setFields((form.fields as FieldSchemaUnion[]) ?? []);
    }
  }, [form]);

  const fieldsUpsertMutation = trpc.forms.fieldsUpsert.useMutation({
    onSuccess: () => { setSaveState("saved"); setTimeout(() => setSaveState("idle"), 2000); },
    onError: (e) => { setSaveState("idle"); toast.error(e.message); },
  });

  const updateMutation = trpc.forms.update.useMutation({
    onSuccess: () => { void refetch(); toast.success("Saved!"); },
    onError: (e) => toast.error(e.message),
  });

  const publishMutation = trpc.forms.publish.useMutation({
    onSuccess: () => { void refetch(); toast.success("Form published! 🎉"); },
    onError: (e) => toast.error(e.message),
  });

  const unpublishMutation = trpc.forms.unpublish.useMutation({
    onSuccess: () => { void refetch(); toast.success("Form unpublished"); },
    onError: (e) => toast.error(e.message),
  });

  const saveFields = useCallback((newFields: FieldSchemaUnion[]) => {
    setSaveState("saving");
    fieldsUpsertMutation.mutate({ formId, fields: newFields });
  }, [formId, fieldsUpsertMutation]);

  const addField = (type: FieldSchemaUnion["type"]) => {
    const newField = createField(type);
    const newFields = [...fields, newField];
    setFields(newFields);
    setSelectedIdx(newFields.length - 1);
    saveFields(newFields);
  };

  const removeField = (idx: number) => {
    const newFields = fields.filter((_, i) => i !== idx);
    setFields(newFields);
    setSelectedIdx(null);
    saveFields(newFields);
  };

  const moveField = (from: number, to: number) => {
    const newFields = [...fields];
    const [moved] = newFields.splice(from, 1);
    if (moved) newFields.splice(to, 0, moved);
    setFields(newFields);
    saveFields(newFields);
  };

  const updateField = (idx: number, updates: Partial<FieldSchemaUnion>) => {
    const newFields = fields.map((f, i) =>
      i === idx ? ({ ...f, ...updates } as FieldSchemaUnion) : f
    );
    setFields(newFields);
    saveFields(newFields);
  };

  const selectedField = selectedIdx !== null ? fields[selectedIdx] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-gray-400 animate-pulse">Loading form builder...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen gap-4">
        <div className="text-gray-400">Form not found</div>
        <Link href="/dashboard/forms" className="text-orange-400 hover:underline">← Back to forms</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/forms" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Forms
          </Link>
          <span className="text-gray-600">/</span>
          <input
            defaultValue={form.title}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== form.title) {
                updateMutation.mutate({ formId, title: e.target.value.trim() });
              }
            }}
            className="bg-transparent font-semibold text-sm focus:outline-none focus:bg-white/5 rounded px-2 py-1 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs ${saveState === "saving" ? "text-yellow-400" : saveState === "saved" ? "text-green-400" : "text-gray-600"}`}>
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "✓ Saved" : ""}
          </span>

          <Link
            href={`/dashboard/forms/${formId}/preview`}
            className="text-sm px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
          >
            Preview
          </Link>

          {form.status === "draft" ? (
            <button
              onClick={() => {
                if (fields.length === 0) { toast.error("Add at least one field before publishing"); return; }
                publishMutation.mutate({ formId });
              }}
              disabled={publishMutation.isPending}
              className="text-sm px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              Publish
            </button>
          ) : (
            <button
              onClick={() => unpublishMutation.mutate({ formId })}
              disabled={unpublishMutation.isPending}
              className="text-sm px-4 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-lg transition-all disabled:opacity-50"
            >
              Unpublish
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — field palette / theme / settings */}
        <div className="w-64 flex-shrink-0 bg-gray-900 border-r border-white/10 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(["fields", "theme", "settings"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-all ${
                  tab === t ? "text-orange-400 border-b-2 border-orange-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab === "fields" && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 mb-2 px-1">Click to add a field</p>
                {FIELD_TYPES.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <span className="w-7 h-7 flex items-center justify-center bg-white/10 rounded text-xs font-mono">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {tab === "theme" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2 px-1">Choose a theme</p>
                {THEME_PICKER_OPTIONS.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => updateMutation.mutate({ formId, theme: theme.value })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      form.theme === theme.value
                        ? "bg-white/10 text-white border border-white/20"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${theme.color} flex-shrink-0`} />
                    {theme.label}
                    {form.theme === theme.value && <span className="ml-auto text-orange-400">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {tab === "settings" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Visibility</label>
                  <select
                    defaultValue={form.visibility}
                    onChange={(e) => updateMutation.mutate({ formId, visibility: e.target.value as "public" | "unlisted" })}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Custom Slug</label>
                  <input
                    defaultValue={form.slug}
                    onBlur={(e) => {
                      if (e.target.value !== form.slug) {
                        updateMutation.mutate({ formId, slug: e.target.value });
                      }
                    }}
                    placeholder="my-custom-slug"
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Thank-you Message</label>
                  <textarea
                    defaultValue={form.thankyouMessage ?? ""}
                    onBlur={(e) => updateMutation.mutate({ formId, thankyouMessage: e.target.value })}
                    rows={3}
                    placeholder="Thank you for your response!"
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Access Password</label>
                  <input
                    type="password"
                    placeholder="Set to password-protect"
                    onBlur={(e) => {
                      if (e.target.value) updateMutation.mutate({ formId, accessPassword: e.target.value });
                    }}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Response Limit</label>
                  <input
                    type="number"
                    defaultValue={form.responseLimit ?? ""}
                    onBlur={(e) => updateMutation.mutate({ formId, responseLimit: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="No limit"
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="respondent-confirmation"
                    defaultChecked={form.sendRespondentConfirmation}
                    onChange={(e) => updateMutation.mutate({ formId, sendRespondentConfirmation: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="respondent-confirmation" className="text-xs text-gray-400">
                    Send respondent confirmation email
                  </label>
                </div>

                {form.status === "published" && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-2">Public link</p>
                    <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono break-all">
                      /f/{form.slug}
                    </div>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
                        toast.success("Copied!");
                      }}
                      className="mt-2 w-full text-xs py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center — canvas */}
        <div className="flex-1 overflow-y-auto bg-gray-950 p-6">
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-gray-500 mb-2">No fields yet</p>
              <p className="text-sm text-gray-600">Click a field type on the left to add it</p>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
              </div>
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`group bg-gray-800/50 border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedIdx === idx
                      ? "border-orange-500/50 shadow-lg shadow-orange-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-400">
                          {field.type.replace("_", " ")}
                        </span>
                        {field.required && <span className="text-xs text-red-400">required</span>}
                      </div>
                      <div className="font-medium text-sm truncate">{field.label}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveField(idx, Math.max(0, idx - 1)); }}
                        disabled={idx === 0}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 rounded"
                      >↑</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveField(idx, Math.min(fields.length - 1, idx + 1)); }}
                        disabled={idx === fields.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-20 rounded"
                      >↓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeField(idx); }}
                        className="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-400 rounded"
                      >×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel — field config */}
        {selectedField && selectedIdx !== null && (
          <div className="w-72 flex-shrink-0 bg-gray-900 border-l border-white/10 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Field Settings</h3>
              <button onClick={() => setSelectedIdx(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Label</label>
                <input
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedIdx, { label: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Placeholder</label>
                <input
                  value={selectedField.placeholder ?? ""}
                  onChange={(e) => updateField(selectedIdx, { placeholder: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Description</label>
                <input
                  value={selectedField.description ?? ""}
                  onChange={(e) => updateField(selectedIdx, { description: e.target.value })}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={selectedField.required}
                  onChange={(e) => updateField(selectedIdx, { required: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="field-required" className="text-xs text-gray-400">Required field</label>
              </div>

              {/* Type-specific configs */}
              {(selectedField.type === "single_select" || selectedField.type === "multi_select") && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Options (one per line)</label>
                  <textarea
                    value={(selectedField.options ?? []).join("\n")}
                    onChange={(e) => updateField(selectedIdx, { options: e.target.value.split("\n").filter(Boolean) } as Partial<FieldSchemaUnion>)}
                    rows={5}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 resize-none font-mono"
                  />
                </div>
              )}

              {selectedField.type === "rating" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Max Rating (2-10)</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={selectedField.maxRating}
                    onChange={(e) => updateField(selectedIdx, { maxRating: parseInt(e.target.value) } as Partial<FieldSchemaUnion>)}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              )}

              {(selectedField.type === "short_text" || selectedField.type === "long_text") && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Min Length</label>
                    <input
                      type="number"
                      value={(selectedField as { minLength?: number }).minLength ?? ""}
                      onChange={(e) => updateField(selectedIdx, { minLength: e.target.value ? parseInt(e.target.value) : undefined } as Partial<FieldSchemaUnion>)}
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Max Length</label>
                    <input
                      type="number"
                      value={(selectedField as { maxLength?: number }).maxLength ?? ""}
                      onChange={(e) => updateField(selectedIdx, { maxLength: e.target.value ? parseInt(e.target.value) : undefined } as Partial<FieldSchemaUnion>)}
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </>
              )}

              {selectedField.type === "number" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Min Value</label>
                    <input
                      type="number"
                      value={(selectedField as { min?: number }).min ?? ""}
                      onChange={(e) => updateField(selectedIdx, { min: e.target.value ? parseInt(e.target.value) : undefined } as Partial<FieldSchemaUnion>)}
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Max Value</label>
                    <input
                      type="number"
                      value={(selectedField as { max?: number }).max ?? ""}
                      onChange={(e) => updateField(selectedIdx, { max: e.target.value ? parseInt(e.target.value) : undefined } as Partial<FieldSchemaUnion>)}
                      className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
