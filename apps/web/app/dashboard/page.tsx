import { api } from "~/trpc/server";
import Link from "next/link";

export default async function DashboardPage() {
  let forms: Awaited<ReturnType<typeof api.forms.list.query>>["items"] = [];
  let totalResponses = 0;

  try {
    const result = await api.forms.list.query({ page: 1, pageSize: 100 });
    forms = result.items;
  } catch {
    // Not authed or error — layout handles redirect
  }

  const publishedCount = forms.filter((f) => f.status === "published").length;

  const STAT_CARDS = [
    { label: "Total Forms", value: forms.length, icon: "📝", color: "from-blue-500 to-cyan-500" },
    { label: "Published", value: publishedCount, icon: "🌐", color: "from-green-500 to-emerald-500" },
    { label: "Total Responses", value: totalResponses, icon: "📨", color: "from-orange-500 to-amber-500" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back! Here&apos;s an overview of your forms.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="bg-gray-800/50 border border-white/10 rounded-xl p-5"
          >
            <div className={`inline-flex w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} items-center justify-center text-lg mb-3`}>
              {card.icon}
            </div>
            <div className="text-3xl font-bold">{card.value}</div>
            <div className="text-gray-400 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recent forms or empty state */}
      {forms.length === 0 ? (
        <div className="bg-gray-800/30 border border-dashed border-white/20 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-bold mb-2">Create your first form</h2>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Get started by creating a form. Choose a theme, add fields, and share with the world.
          </p>
          <Link
            href="/dashboard/forms/new"
            id="create-first-form-btn"
            className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
          >
            Create Form
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Forms</h2>
            <Link href="/dashboard/forms" className="text-orange-400 text-sm hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {forms.slice(0, 5).map((form) => (
              <div
                key={form.id}
                className="bg-gray-800/50 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-2xl flex-shrink-0">
                    {form.status === "published" ? "🌐" : form.status === "archived" ? "🗄️" : "📄"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{form.title}</div>
                    <div className="text-sm text-gray-400">/{form.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    form.status === "published" ? "bg-green-500/20 text-green-400" :
                    form.status === "archived" ? "bg-gray-500/20 text-gray-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {form.status}
                  </span>
                  <Link
                    href={`/dashboard/forms/${form.id}/edit`}
                    className="text-sm text-orange-400 hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href="/dashboard/forms/new"
              id="new-form-btn"
              className="inline-flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
            >
              <span>+</span> New Form
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
