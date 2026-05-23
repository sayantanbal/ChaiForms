import { api } from "~/trpc/server";

export default async function AdminUsersPage() {
  const users = await api.admin.listUsers.query({ page: 1, pageSize: 50 });

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Forms</th>
          </tr>
        </thead>
        <tbody>
          {users.items.map((user) => (
            <tr key={user.id} className="border-b border-white/5">
              <td className="px-4 py-3">{user.fullName}</td>
              <td className="px-4 py-3 text-gray-400">{user.email}</td>
              <td className="px-4 py-3 capitalize">{user.role}</td>
              <td className="px-4 py-3">{user.formCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
