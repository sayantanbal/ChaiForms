import { api } from "~/trpc/server";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Forms — ChaiForms",
  description: "Discover and fill public forms created by the ChaiForms community.",
};

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

async function getPublicForms() {
  try {
    return await api.explore.listPublicForms.query({ page: 1, pageSize: 24 });
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 24 };
  }
}

export default async function ExplorePage() {
  const { items: forms, total } = await getPublicForms();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span>☕</span>
            <span className="font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">ChaiForms</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/templates" className="text-gray-400 hover:text-white transition-colors">Templates</Link>
            <Link href="/auth/sign-in" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg transition-colors font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Public Forms</h1>
          <p className="text-gray-400">{total} public form{total !== 1 ? "s" : ""} from the community</p>
        </div>

        {forms.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🔍</div>
            <p>No public forms yet. Be the first!</p>
            <Link href="/auth/sign-in" className="mt-4 inline-block text-orange-400 hover:underline">Create a form →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {forms.map((form) => (
              <Link
                key={form.id}
                href={`/f/${form.slug}`}
                className={`group bg-gradient-to-br ${THEME_GRADIENTS[form.theme] ?? THEME_GRADIENTS.default} bg-gray-800/30 border border-white/10 rounded-xl p-5 hover:border-white/30 transition-all duration-300 hover:-translate-y-0.5`}
              >
                <div className="mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${THEME_BADGE[form.theme] ?? THEME_BADGE.default}`}>
                    {form.theme.replace("_", " ")}
                  </span>
                </div>
                <h2 className="font-bold group-hover:text-orange-400 transition-colors mb-1 line-clamp-2">
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
        )}
      </div>
    </div>
  );
}
