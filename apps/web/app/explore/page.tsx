"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "~/trpc/client";

const THEME_GRADIENTS: Record<string, string> = {
  anime: "from-pink-500/20 to-purple-500/20",
  startup: "from-orange-500/20 to-amber-500/20",
  os: "from-cyan-500/20 to-blue-500/20",
  game: "from-green-500/20 to-emerald-500/20",
  movie: "from-red-500/20 to-rose-500/20",
  tech_company: "from-blue-500/20 to-indigo-500/20",
  event: "from-yellow-500/20 to-orange-500/20",
  default: "from-gray-500/20 to-slate-500/20",
};

const THEME_BADGE: Record<string, string> = {
  anime: "bg-pink-500/20 text-pink-300",
  startup: "bg-orange-500/20 text-orange-300",
  os: "bg-cyan-500/20 text-cyan-300",
  game: "bg-green-500/20 text-green-300",
  movie: "bg-red-500/20 text-red-300",
  tech_company: "bg-blue-500/20 text-blue-300",
  event: "bg-yellow-500/20 text-yellow-300",
  default: "bg-gray-500/20 text-gray-300",
};

const PAGE_SIZE = 24;

export default function ExplorePage() {
  const [page, setPage] = useState(1);

  const { data: me } = trpc.auth.me.useQuery(undefined, { retry: false });
  const { data, isLoading } = trpc.explore.listPublicForms.useQuery({ page, pageSize: PAGE_SIZE });

  const forms = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span>☕</span>
            <span className="font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              ChaiForms
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/templates" className="text-gray-400 hover:text-white transition-colors">
              Templates
            </Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            {me ? (
              <Link
                href="/dashboard"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold transition-transform hover:scale-105 shadow-lg"
              >
                {me.fullName.charAt(0).toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg transition-colors font-semibold"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Explore Public Forms</h1>
          <p className="text-gray-400">
            {isLoading
              ? "Loading..."
              : `${total} public form${total !== 1 ? "s" : ""} from the community`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-44 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold mb-2 text-white">No public forms yet</h2>
            <p className="text-gray-400 mb-6">Be the first to publish a form for the community!</p>
            <Link
              href="/dashboard/forms/new"
              className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Create a Form →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  href={`/f/${form.slug}`}
                  className={`group bg-gradient-to-br ${THEME_GRADIENTS[form.theme] ?? THEME_GRADIENTS.default} bg-gray-800/30 border border-white/10 rounded-xl p-5 hover:border-white/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 flex flex-col`}
                >
                  <div className="mb-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${THEME_BADGE[form.theme] ?? THEME_BADGE.default}`}
                    >
                      {form.theme.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="font-bold group-hover:text-orange-400 transition-colors mb-1 line-clamp-2 flex-1">
                    {form.title}
                  </h2>
                  {form.description && (
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{form.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto">
                    {form.hasPassword && <span>🔒 Password</span>}
                    <span className="ml-auto">{(form.fields as unknown[]).length} fields</span>
                  </div>
                  <div className="mt-3 text-orange-400 text-xs font-semibold group-hover:underline">
                    Fill this form →
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === 1}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-400 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === totalPages}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-white/10 py-8 px-4 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>☕</span>
            <span className="font-bold text-gray-400">ChaiForms</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/templates" className="hover:text-gray-300 transition-colors">
              Templates
            </Link>
            <Link href="/pricing" className="hover:text-gray-300 transition-colors">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
