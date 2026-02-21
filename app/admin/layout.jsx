import { requireAdmin } from '../../lib/admin.js';

export default async function AdminLayout({ children }) {
  const { admin } = await requireAdmin('read_only');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-700 text-white px-4 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Admin Panel</span>
          <a href="/admin" className="hover:underline">Dashboard</a>
          <a href="/admin/users" className="hover:underline">Users</a>
          <a href="/admin/images" className="hover:underline">Images</a>
          <a href="/admin/audit-log" className="hover:underline">Audit Log</a>
        </div>
        <span className="text-purple-200 text-xs capitalize">{admin.role.replace('_', ' ')}</span>
      </div>
      {children}
    </div>
  );
}
