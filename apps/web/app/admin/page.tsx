import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, forms, users] = await Promise.all([
    api.admin.getStats.query(),
    api.admin.listForms.query({ page: 1, pageSize: 10 }),
    api.admin.listUsers.query({ page: 1, pageSize: 10 }),
  ]);

  const statCards = [
    { label: "Users", value: stats.userCount },
    { label: "Published forms", value: stats.formCountByStatus.published },
    { label: "Draft forms", value: stats.formCountByStatus.draft },
    { label: "Total responses", value: stats.totalResponses },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-gray-900 p-4"
          >
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
          <h2 className="mb-4 text-lg font-semibold">Recent forms</h2>
          <div className="space-y-3">
            {forms.items.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between border-b border-white/5 pb-3 text-sm last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{form.title}</p>
                  <p className="text-gray-500">{form.ownerEmail}</p>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs capitalize">
                  {form.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
          <h2 className="mb-4 text-lg font-semibold">Recent users</h2>
          <div className="space-y-3">
            {users.items.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between border-b border-white/5 pb-3 text-sm last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
