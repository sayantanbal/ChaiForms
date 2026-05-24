import { AdminUsersTable } from "./admin-users-table";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Users</h1>
      <AdminUsersTable />
    </div>
  );
}
