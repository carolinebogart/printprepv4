import { requireAdmin } from '../../../lib/admin.js';
import AuditLogTable from '../../../components/AuditLogTable.jsx';

export default async function AuditLogPage({ searchParams }) {
  const { admin, supabase } = await requireAdmin('read_only');
  const params = await searchParams;
  const page = parseInt(params?.page || '1', 10);
  const actionFilter = params?.action || '';
  const perPage = 100;

  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (actionFilter) {
    query = query.eq('action_type', actionFilter);
  }

  const { data: logs, count } = await query;
  const totalPages = Math.ceil((count || 0) / perPage);

  // Get unique action types for filter
  const { data: actionTypes } = await supabase
    .from('admin_audit_log')
    .select('action_type')
    .limit(200);

  const uniqueActions = [...new Set((actionTypes || []).map((a) => a.action_type))].sort();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        {admin.role === 'super_admin' && (
          <TruncateLink />
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <form className="flex gap-2">
          <select name="action" defaultValue={actionFilter} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary text-sm">Filter</button>
        </form>
      </div>

      <AuditLogTable logs={logs || []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {page > 1 && (
            <a
              href={`/admin/audit-log?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ''}`}
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
              href={`/admin/audit-log?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ''}`}
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

function TruncateLink() {
  return (
    <a href="/admin/audit-log/truncate" className="text-sm text-red-600 hover:underline">
      Truncate Log
    </a>
  );
}
