"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";
import Link from "next/link";

const THEME_GRADIENTS: Record<string, string> = {
  anime: "from-pink-500 to-purple-600",
  startup: "from-orange-500 to-amber-600",
  os: "from-cyan-500 to-blue-600",
  game: "from-green-500 to-emerald-600",
  movie: "from-red-500 to-rose-600",
  tech_company: "from-blue-500 to-indigo-600",
  event: "from-yellow-500 to-orange-600",
  default: "from-gray-500 to-slate-600",
};

const THEME_EMOJIS: Record<string, string> = {
  anime: "🌸", startup: "🚀", os: "🖥️", game: "🎮",
  movie: "🎬", tech_company: "💻", event: "🎉", default: "📝",
};

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

  const { data: templates, isLoading: templatesLoading } = trpc.explore.listTemplates.useQuery(undefined);

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
    <div className="p-6 max-w-5xl mx-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-800/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(templates ?? []).map((template) => {
              const gradient = THEME_GRADIENTS[template.theme] ?? "from-gray-500 to-slate-600";
              const emoji = THEME_EMOJIS[template.theme] ?? "📝";
              
              return (
                <div
                  key={template.id}
                  className="border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 group flex flex-col bg-gray-800/50 text-left"
                >
                  <div className={`bg-gradient-to-br ${gradient} p-8 text-center`}>
                    <div className="text-5xl mb-2">{emoji}</div>
                    <div className="text-xs font-bold text-white/70 uppercase tracking-widest">
                      {template.theme.replace("_", " ")} theme
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="font-bold text-lg mb-1.5 group-hover:text-orange-400 transition-colors">
                      {template.title}
                    </h2>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-gray-500">{(template.fields as unknown[]).length} fields</span>
                      <div className="flex items-center gap-3">
                        <Link href={`/templates/${template.id}`} target="_blank" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
                          Preview
                        </Link>
                        <button
                          onClick={() => createFromTemplateMutation.mutate({ templateId: template.id })}
                          disabled={createFromTemplateMutation.isPending}
                          className={`text-sm font-bold text-white px-4 py-1.5 rounded-lg bg-gradient-to-r ${gradient} hover:opacity-90 transition-opacity disabled:opacity-50`}
                        >
                          Use Template →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
