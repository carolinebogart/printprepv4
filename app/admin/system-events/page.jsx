import { requireAdmin } from '../../../lib/admin.js';
import EventDetailsViewer from '../../../components/EventDetailsViewer.jsx';

const EVENT_TYPE_LABELS = {
  upscale_failure: 'Upscale Failure',
  output_mismatch: 'Output Mismatch',
  upload_failure: 'Upload Failure',
  processing_crash: 'Processing Crash',
  cleanup_run: 'Cleanup Run',
};

const SEVERITY_STYLES = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900 font-semibold',
};

const EVENT_TYPE_STYLES = {
  upscale_failure: 'bg-purple-100 text-purple-800',
  output_mismatch: 'bg-orange-100 text-orange-800',
  upload_failure: 'bg-blue-100 text-blue-800',
  processing_crash: 'bg-red-100 text-red-800',
  cleanup_run: 'bg-green-100 text-green-800',
};

export default async function SystemEventsPage({ searchParams }) {
  const { supabase } = await requireAdmin('read_only');
  const params = await searchParams;
  const page = parseInt(params?.page || '1', 10);
  const typeFilter = params?.type || '';
  const perPage = 50;

  let query = supabase
    .from('system_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (typeFilter) {
    query = query.eq('event_type', typeFilter);
  }

  const { data: events, count } = await query;
  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Events</h1>
          <p className="text-sm text-gray-500 mt-1">{count || 0} total events</p>
        </div>
      </div>

      {/* Filter */}
      <form className="flex gap-2 mb-4">
        <select name="type" defaultValue={typeFilter} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary text-sm">Filter</button>
        {typeFilter && (
          <a href="/admin/system-events" className="btn-secondary text-sm self-center">Clear</a>
        )}
      </form>

      {/* Table */}
      {!events?.length ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-gray-200">
          No system events recorded.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Image</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(event.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${EVENT_TYPE_STYLES[event.event_type] || 'bg-gray-100 text-gray-700'}`}>
                      {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${SEVERITY_STYLES[event.severity] || 'bg-gray-100 text-gray-700'}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs">
                    <span className="line-clamp-2">{event.message}</span>
                    {event.event_type === 'output_mismatch' && event.details?.failureBreakdown && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(event.details.failureBreakdown).map(([err, count]) => (
                          <span key={err} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {count}× {err}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {event.details?.userEmail ? (
                      event.user_id
                        ? <a href={`/admin/users/${event.user_id}`} className="hover:underline text-blue-600">{event.details.userEmail}</a>
                        : <span className="text-gray-700">{event.details.userEmail}</span>
                    ) : event.user_id ? (
                      <a href={`/admin/users/${event.user_id}`} className="hover:underline text-blue-600 font-mono">{event.user_id.slice(0, 8)}…</a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {event.details?.imageDimensions ? (
                      <div>
                        <div className="font-medium text-gray-700">{event.details.imageDimensions}</div>
                        {event.details.imageFormat && <div className="text-gray-400 uppercase">{event.details.imageFormat}</div>}
                      </div>
                    ) : event.image_id ? (
                      <span className="font-mono">{event.image_id.slice(0, 8)}…</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {event.details?.planName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {event.details && Object.keys(event.details).length > 0 && (
                      <EventDetailsViewer details={event.details} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {page > 1 && (
            <a
              href={`/admin/system-events?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ''}`}
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
              href={`/admin/system-events?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ''}`}
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
