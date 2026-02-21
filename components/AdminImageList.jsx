'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminImageList({ images, userMap, outputCounts, canDelete }) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map((img) => img.id)));
    }
  }

  async function handleDelete(imageId) {
    if (!confirm('Delete this image and all its outputs? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/images/${imageId}/delete`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Network error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} image(s) and all their outputs? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/images/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_ids: [...selected] }),
      });
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to bulk delete');
      }
    } catch {
      alert('Network error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {canDelete && selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <span className="text-sm font-medium text-red-800">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left bg-gray-50">
              {canDelete && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === images.length && images.length > 0}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium text-gray-500">Filename</th>
              <th className="px-4 py-3 font-medium text-gray-500">User</th>
              <th className="px-4 py-3 font-medium text-gray-500">Dimensions</th>
              <th className="px-4 py-3 font-medium text-gray-500">Orientation</th>
              <th className="px-4 py-3 font-medium text-gray-500">Outputs</th>
              <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 font-medium text-gray-500">Date</th>
              {canDelete && <th className="px-4 py-3 font-medium text-gray-500 w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.id} className="border-b border-gray-100 hover:bg-gray-50">
                {canDelete && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(img.id)}
                      onChange={() => toggleSelect(img.id)}
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[200px]" title={img.original_filename}>
                  {img.original_filename}
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">
                  {userMap[img.user_id] || img.user_id.slice(0, 8) + '...'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {img.width && img.height ? `${img.width}×${img.height}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    img.orientation === 'portrait'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {img.orientation || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{outputCounts[img.id] || 0}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${
                    img.status === 'processed' ? 'badge-success' : img.status === 'error' ? 'badge-error' : 'badge-warning'
                  }`}>
                    {img.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(img.created_at).toLocaleDateString()}
                </td>
                {canDelete && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(img.id)}
                      disabled={deleting}
                      className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {images.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 9 : 7} className="px-4 py-8 text-center text-gray-500">
                  No images found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
