import type { Metadata } from "next";
import { api } from "~/trpc/server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ChaiForms — Build Beautiful Forms in Style",
  description:
    "ChaiForms is a Typeform-style form builder with themed forms, analytics, and public sharing. Create, publish, and analyze forms in minutes.",
};

const FEATURES = [
  {
    icon: "🎨",
    title: "8 Stunning Themes",
    desc: "Anime, startup, tech, OS, game, movie, event — each form tells a story.",
  },
  {
    icon: "📊",
    title: "Real-time Analytics",
    desc: "Track responses, completion rates, and field breakdowns with beautiful charts.",
  },
  {
    icon: "🔗",
    title: "Shareable Links & QR",
    desc: "Share via link or QR code. Password-protect sensitive forms.",
  },
  {
    icon: "⚡",
    title: "Drag & Drop Builder",
    desc: "9 field types, conditional logic, multi-page forms — built visually.",
  },
  {
    icon: "📧",
    title: "Email Notifications",
    desc: "Creators get notified on every submission. Respondents get confirmation emails.",
  },
  {
    icon: "🌐",
    title: "Public Explore Gallery",
    desc: "Discover public forms. Use templates to get started instantly.",
  },
];

const TESTIMONIALS = [
  {
    name: "Aarav Mehta",
    role: "Product Manager",
    quote:
      "ChaiForms replaced our entire Typeform subscription. The anime theme absolutely wowed our team. The analytics dashboard is 🔥",
    avatar: "AM",
    color: "from-purple-500 to-pink-500",
  },
  {
    name: "Priya Sharma",
    role: "Indie Hacker",
    quote:
      "Built a startup idea validator in 10 minutes. The conditional logic is seamless and the response CSV export saved my hackathon.",
    avatar: "PS",
    color: "from-orange-500 to-amber-500",
  },
  {
    name: "Dev Kapoor",
    role: "Open-source Contributor",
    quote:
      "Love the OS theme — finally a form that speaks my language. The tRPC + Drizzle stack under the hood is just *chef's kiss*.",
    avatar: "DK",
    color: "from-cyan-500 to-blue-500",
  },
];

async function getAuthUrl() {
  return "/login";
}

async function getFeaturedForms() {
  try {
    return await api.explore.listFeaturedForms.query();
  } catch {
    return [];
  }
}

const THEME_COLORS: Record<string, string> = {
  anime: "from-pink-500 to-purple-600",
  startup: "from-orange-500 to-amber-600",
  os: "from-cyan-500 to-blue-600",
  game: "from-green-500 to-emerald-600",
  movie: "from-red-500 to-rose-600",
  tech_company: "from-blue-500 to-indigo-600",
  event: "from-yellow-500 to-orange-600",
  default: "from-gray-500 to-slate-600",
};

export default async function HomePage() {
  const [authUrl, featuredForms] = await Promise.all([getAuthUrl(), getFeaturedForms()]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">☕</span>
              <span className="font-bold text-xl bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                ChaiForms
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
              <Link href="/explore" className="hover:text-white transition-colors">
                Explore
              </Link>
              <Link href="/templates" className="hover:text-white transition-colors">
                Templates
              </Link>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
            </div>
            <a
              href={authUrl}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 text-sm"
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-purple-900/20 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5 text-sm text-orange-400 mb-6">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            Form builder reimagined with style
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Build forms that
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
              people actually love
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Typeform-style forms with themed visuals, drag-and-drop builder, real-time analytics,
            and instant sharing. Your forms, your way.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={authUrl}
              id="hero-get-started"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
            >
              Get Started — It&apos;s Free
            </a>
            <Link
              href="/explore"
              className="border border-white/20 hover:border-white/40 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200"
            >
              Browse Forms
            </Link>
          </div>
        </div>

        {/* Floating theme badges */}
        <div className="relative max-w-4xl mx-auto mt-20 flex flex-wrap justify-center gap-3">
          {["anime", "startup", "os", "game", "movie", "tech_company", "event", "default"].map(
            (theme) => (
              <span
                key={theme}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${THEME_COLORS[theme]} text-white shadow-lg`}
              >
                {theme.replace("_", " ")}
              </span>
            ),
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to collect data
            </h2>
            <p className="text-gray-400 text-lg">
              Built for creators who care about the experience, not just the data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-gray-800/50 border border-white/10 rounded-2xl p-6 hover:bg-gray-800/80 hover:border-white/20 transition-all duration-300 group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Forms */}
      {featuredForms.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Featured Forms</h2>
              <p className="text-gray-400">Discover what the community is building</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredForms.map((form) => (
                <Link
                  key={form.id}
                  href={`/f/${form.slug}`}
                  className="group bg-gray-800/50 border border-white/10 rounded-xl p-5 hover:border-white/30 hover:bg-gray-800 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${THEME_COLORS[form.theme] ?? THEME_COLORS.default} text-white`}
                    >
                      {form.theme.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="font-bold text-white group-hover:text-orange-400 transition-colors mb-1 line-clamp-1">
                    {form.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{form.description}</p>
                  <div className="mt-4 text-orange-400 text-sm font-semibold group-hover:underline">
                    Fill this form →
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 border border-white/20 hover:border-orange-500/50 text-gray-300 hover:text-orange-400 px-6 py-3 rounded-xl transition-all duration-200"
              >
                Explore all public forms →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Loved by creators</h2>
            <p className="text-gray-400">Don&apos;t just take our word for it</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-gray-800/50 border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
              >
                <p className="text-gray-300 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">Ready to build your first form?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Free to use, beautiful by default. No credit card required.
          </p>
          <a
            href={authUrl}
            id="footer-cta-start"
            className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg shadow-orange-500/25 hover:scale-105"
          >
            Start Building for Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>☕</span>
            <span className="font-bold text-gray-400">ChaiForms</span>
            <span>— Form builder SaaS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="hover:text-gray-300 transition-colors">
              Explore
            </Link>
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
