'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TruncateAuditLogPage() {
  const router = useRouter();
  const [beforeDate, setBeforeDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!beforeDate) {
      setError('Please select a date');
      return;
    }
    if (!note || note.trim().length < 5) {
      setError('Admin note is required (min 5 characters)');
      return;
    }

    const confirmed = window.confirm(
      `This will permanently delete all audit log entries before ${beforeDate}. This cannot be undone. Continue?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-log/truncate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          before_date: beforeDate + 'T23:59:59.999Z',
          admin_note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to truncate');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Truncate Audit Log</h1>
      <p className="text-sm text-gray-500 mb-6">
        Permanently delete audit log entries before a given date. Super Admin only.
      </p>

      {error && <div className="flash-error mb-4">{error}</div>}

      {result ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">
            Successfully deleted {result.deleted} audit log entries.
          </p>
          <button
            onClick={() => router.push('/admin/audit-log')}
            className="mt-3 btn-primary text-sm"
          >
            Back to Audit Log
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delete entries before
            </label>
            <input
              type="date"
              value={beforeDate}
              onChange={(e) => setBeforeDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Reason for truncation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Deleting...' : 'Truncate Audit Log'}
          </button>
        </form>
      )}
    </div>
    </div>
  );
}
