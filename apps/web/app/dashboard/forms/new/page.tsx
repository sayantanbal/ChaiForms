"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import Link from "next/link";

export default function NewFormPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");

  const createMutation = trpc.forms.create.useMutation({
    onSuccess: (form) => {
      toast.success("Form created! Let's build it.");
      router.push(`/dashboard/forms/${form.id}/edit`);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: templates, isLoading: templatesLoading } = trpc.explore.listTemplates.useQuery();

  const createFromTemplateMutation = trpc.forms.createFromTemplate.useMutation({
    onSuccess: (form) => {
      toast.success("Form created from template!");
      router.push(`/dashboard/forms/${form.id}/edit`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createMutation.mutate({ title: title.trim() });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard/forms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block">
          ← Back to forms
        </Link>
        <h1 className="text-2xl font-bold">Create New Form</h1>
        <p className="text-gray-400 mt-1">Start from scratch or use a template.</p>
      </div>

      {/* Create from scratch */}
      <div className="bg-gray-800/50 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Start from scratch</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="form-title" className="block text-sm font-medium text-gray-400 mb-2">
              Form Title
            </label>
            <input
              id="form-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Customer Feedback Survey"
              className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all"
              autoFocus
            />
          </div>
          <button
            type="submit"
            id="create-form-submit"
            disabled={!title.trim() || createMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all"
          >
            {createMutation.isPending ? "Creating..." : "Create Form →"}
          </button>
        </form>
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Or start from a template</h2>
        {templatesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(templates ?? []).map((template) => (
              <button
                key={template.id}
                onClick={() => createFromTemplateMutation.mutate({ templateId: template.id })}
                disabled={createFromTemplateMutation.isPending}
                className="text-left bg-gray-800/50 border border-white/10 hover:border-orange-500/40 hover:bg-gray-800 rounded-xl p-4 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                    {template.theme.replace("_", " ")}
                  </span>
                </div>
                <div className="font-semibold group-hover:text-orange-400 transition-colors mb-1 text-sm">
                  {template.title}
                </div>
                <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                <div className="text-xs text-gray-500 mt-2">{(template.fields as unknown[]).length} fields</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
