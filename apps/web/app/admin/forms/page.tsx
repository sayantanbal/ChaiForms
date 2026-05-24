import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminFormsPage() {
  const forms = await api.admin.listForms.query({ page: 1, pageSize: 50 });

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Visibility</th>
            <th className="px-4 py-3 font-medium">Responses</th>
          </tr>
        </thead>
        <tbody>
          {forms.items.map((form) => (
            <tr key={form.id} className="border-b border-white/5">
              <td className="px-4 py-3">{form.title}</td>
              <td className="px-4 py-3 text-gray-400">{form.ownerEmail}</td>
              <td className="px-4 py-3 capitalize">{form.status}</td>
              <td className="px-4 py-3 capitalize">{form.visibility}</td>
              <td className="px-4 py-3">{form.responseCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
