import { requireAdmin } from '../../lib/admin.js';
import { createServiceClient } from '../../lib/supabase/service.js';

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin('read_only');
  const service = createServiceClient();

  // Stats
  const { count: totalUsers } = await service.auth.admin.listUsers({ perPage: 1 })
    .then(res => ({ count: res.data?.users?.length ?? 0 }))
    .catch(() => ({ count: '—' }));

  // Get user count from subscriptions instead (more reliable without pagination)
  const { count: subCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'trialing']);

  const { count: imageCount } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true });

  const { data: creditSum } = await supabase
    .from('subscriptions')
    .select('credits_total');

  const totalCredits = (creditSum || []).reduce((sum, s) => sum + (s.credits_total || 0), 0);

  // Recent audit log
  const { data: recentLogs } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Subscriptions" value={subCount || 0} />
        <StatCard label="Images Processed" value={imageCount || 0} />
        <StatCard label="Total Credits/mo" value={totalCredits} />
        <StatCard label="Audit Entries" value={recentLogs?.length || 0} sub="(last 20)" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <a href="/admin/users" className="btn-primary text-sm">Manage Users</a>
        <a href="/admin/audit-log" className="btn-secondary text-sm">Audit Log</a>
        <a href="/admin/images" className="btn-secondary text-sm">Image Management</a>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Admin Activity</h2>
        {(!recentLogs || recentLogs.length === 0) ? (
          <p className="text-sm text-gray-500">No admin activity logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 font-medium text-gray-500">Date</th>
                  <th className="pb-2 font-medium text-gray-500">Action</th>
                  <th className="pb-2 font-medium text-gray-500">Note</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 text-gray-900">{log.action_type}</td>
                    <td className="py-2 text-gray-600 truncate max-w-[300px]">
                      {log.admin_note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
