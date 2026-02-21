'use client';

import { useState } from 'react';

export default function AuditLogTable({ logs }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left bg-gray-50">
            <th className="px-4 py-3 font-medium text-gray-500">Date</th>
            <th className="px-4 py-3 font-medium text-gray-500">Action</th>
            <th className="px-4 py-3 font-medium text-gray-500">Admin</th>
            <th className="px-4 py-3 font-medium text-gray-500">Target</th>
            <th className="px-4 py-3 font-medium text-gray-500">Note</th>
            <th className="px-4 py-3 font-medium text-gray-500 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <>
              <tr
                key={log.id}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{log.action_type}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">
                  {log.admin_user_id?.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">
                  {log.target_user_id ? `${log.target_user_id.slice(0, 8)}...` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                  {log.admin_note || '—'}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {expandedId === log.id ? '▲' : '▼'}
                </td>
              </tr>
              {expandedId === log.id && (
                <tr key={`${log.id}-detail`}>
                  <td colSpan={6} className="px-4 py-3 bg-gray-50">
                    <div className="text-xs space-y-1">
                      <p><strong>Admin ID:</strong> {log.admin_user_id}</p>
                      <p><strong>Target ID:</strong> {log.target_user_id || '—'}</p>
                      <p><strong>IP:</strong> {log.ip_address || '—'}</p>
                      <p><strong>User Agent:</strong> {log.user_agent || '—'}</p>
                      {log.changes && (
                        <div>
                          <strong>Changes:</strong>
                          <pre className="mt-1 bg-white border border-gray-200 rounded p-2 overflow-x-auto text-xs">
                            {typeof log.changes === 'string'
                              ? JSON.stringify(JSON.parse(log.changes), null, 2)
                              : JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No audit log entries.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
