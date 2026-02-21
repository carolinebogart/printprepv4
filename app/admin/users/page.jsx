import { requireAdmin } from '../../../lib/admin.js';
import { createServiceClient } from '../../../lib/supabase/service.js';
import AdminUserSearch from '../../../components/AdminUserSearch.jsx';

export default async function AdminUsersPage({ searchParams }) {
  const { supabase } = await requireAdmin('read_only');
  const service = createServiceClient();
  const params = await searchParams;
  const page = parseInt(params?.page || '1', 10);
  const search = params?.search || '';
  const perPage = 50;

  // Get users from Supabase auth admin API
  let users = [];
  let total = 0;

  try {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage,
    });
    if (!error && data?.users) {
      users = data.users;
      total = data.total || users.length;
    }
  } catch {
    // fallback
  }

  // Filter by search if provided
  if (search) {
    users = users.filter((u) =>
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Fetch subscriptions for these users
  const userIds = users.map((u) => u.id);
  let subsMap = {};
  if (userIds.length > 0) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, plan_name, status, credits_total, credits_used, current_period_end')
      .in('user_id', userIds);

    (subs || []).forEach((s) => {
      subsMap[s.user_id] = s;
    });
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

      <AdminUserSearch initialSearch={search} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 font-medium text-gray-500">Plan</th>
              <th className="px-4 py-3 font-medium text-gray-500">Credits</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Expires</th>
              <th className="px-4 py-3 font-medium text-gray-500">Joined</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const sub = subsMap[u.id];
              return (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{sub?.plan_name || '—'}</td>
                  <td className="px-4 py-3">
                    {sub ? `${Math.max(0, (sub.credits_total || 0) - (sub.credits_used || 0))}/${sub.credits_total ?? 0}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {sub ? (
                      <span
                        className={`badge ${
                          ['active', 'trialing'].includes(sub.status)
                            ? 'badge-success'
                            : sub.status === 'past_due'
                            ? 'badge-warning'
                            : 'badge-error'
                        }`}
                      >
                        {sub.status}
                      </span>
                    ) : (
                      <span className="text-gray-400">none</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {sub?.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/users/${u.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </a>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {page > 1 && (
            <a
              href={`/admin/users?page=${page - 1}${search ? `&search=${search}` : ''}`}
              className="btn-secondary text-sm"
            >
              Previous
            </a>
          )}
          <span className="text-sm text-gray-500 self-center">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/users?page=${page + 1}${search ? `&search=${search}` : ''}`}
              className="btn-secondary text-sm"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
