import { api } from "~/trpc/server";
import Link from "next/link";
import type { Metadata } from "next";
import { UseTemplateButton } from "~/components/use-template-button";

export const metadata: Metadata = {
  title: "Templates — ChaiForms",
  description: "Start your form from a curated ChaiForms template. Anime, startup, OS, and more.",
};

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

async function getTemplates() {
  try {
    return await api.explore.listTemplates.query(undefined);
  } catch {
    return [];
  }
}

async function getMe() {
  try {
    return await api.auth.me.query(undefined);
  } catch {
    return null;
  }
}

export default async function TemplatesPage() {
  const [templates, me] = await Promise.all([getTemplates(), getMe()]);

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
            <Link href="/explore" className="text-gray-400 hover:text-white transition-colors">Explore</Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
            {me ? (
              <Link
                href="/dashboard"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold transition-transform hover:scale-105 shadow-lg"
              >
                {me.fullName.charAt(0).toUpperCase()}
              </Link>
            ) : (
              <Link href="/login" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg transition-colors font-semibold">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black mb-3">Form Templates</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Start fast with a curated template. Sign in to customize and publish.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg">No templates yet — check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const gradient =
                THEME_GRADIENTS[template.theme] ?? "from-gray-500 to-slate-600";
              const emoji = THEME_EMOJIS[template.theme] ?? "📝";
              return (
                <div
                  key={template.id}
                  className="border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 group"
                >
                  <div className={`bg-gradient-to-br ${gradient} p-8 text-center`}>
                    <div className="text-5xl mb-2">{emoji}</div>
                    <div className="text-xs font-bold text-white/70 uppercase tracking-widest">
                      {template.theme.replace("_", " ")} theme
                    </div>
                  </div>
                  <div className="bg-gray-800/50 p-5">
                    <h2 className="font-bold text-lg mb-1.5 group-hover:text-orange-400 transition-colors">
                      {template.title}
                    </h2>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">{template.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-500">{(template.fields as unknown[]).length} fields</span>
                      <div className="flex items-center gap-3">
                        <Link href={`/templates/${template.id}`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
                          Preview
                        </Link>
                        <UseTemplateButton templateId={template.id} gradient={gradient} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 py-8 px-4 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>☕</span>
            <span className="font-bold text-gray-400">ChaiForms</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-gray-300 transition-colors">Explore</Link>
            <Link href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
