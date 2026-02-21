'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryGrid({ images }) {
  const [search, setSearch] = useState('');
  const [orientationFilter, setOrientationFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // imageId to confirm
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const router = useRouter();

  const filtered = images.filter((img) => {
    const matchesSearch = !search || img.original_filename?.toLowerCase().includes(search.toLowerCase());
    const matchesOrientation =
      orientationFilter === 'all' ||
      img.orientation?.toLowerCase() === orientationFilter;
    return matchesSearch && matchesOrientation;
  });

  const handleDelete = async (imageId) => {
    if (!skipConfirm && deleteConfirm !== imageId) {
      setDeleteConfirm(imageId);
      return;
    }
    setDeleting(imageId);
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete image');
      }
    } catch {
      alert('Failed to delete image');
    }
    setDeleting(null);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={orientationFilter}
          onChange={(e) => setOrientationFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Orientations</option>
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No images match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onDelete={() => handleDelete(img.id)}
              isDeleting={deleting === img.id}
              showConfirm={deleteConfirm === img.id}
              onCancelDelete={() => setDeleteConfirm(null)}
              onConfirmDelete={() => handleDelete(img.id)}
              skipConfirm={skipConfirm}
              setSkipConfirm={setSkipConfirm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({
  image,
  onDelete,
  isDeleting,
  showConfirm,
  onCancelDelete,
  onConfirmDelete,
  skipConfirm,
  setSkipConfirm,
}) {
  const [showOutputs, setShowOutputs] = useState(false);

  const statusColors = {
    processed: 'badge-success',
    pending: 'badge-warning',
    processing: 'badge-warning',
    uploaded: 'badge-warning',
    failed: 'badge-error',
  };

  const outputCount = image.outputs?.length || 0;
  const statusLabel =
    image.status === 'processed'
      ? `Completed (${outputCount})`
      : image.status || 'pending';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      {/* Original image preview + info header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex gap-3">
          {/* Original thumbnail */}
          {image.previewUrl ? (
            <div className="shrink-0 w-20 h-20 bg-gray-50 rounded-md overflow-hidden border border-gray-200 flex items-center justify-center">
              <img
                src={image.previewUrl}
                alt={image.original_filename}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="shrink-0 w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center">
              <span className="text-xs text-gray-400">No preview</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium text-gray-900 truncate"
              title={image.original_filename}
            >
              {image.original_filename}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                {image.width}×{image.height}
              </span>
              <span className="text-xs text-gray-400 capitalize">{image.orientation}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">
                {new Date(image.created_at).toLocaleDateString()}
              </span>
              <span className={`badge text-xs ${statusColors[image.status] || 'badge-warning'}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Output image previews (collapsible) */}
      {outputCount > 0 && (
        <div className="border-b border-gray-100">
          <button
            onClick={() => setShowOutputs(!showOutputs)}
            className="w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center justify-between"
          >
            <span>{outputCount} output{outputCount !== 1 ? 's' : ''}</span>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showOutputs ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showOutputs && (
            <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {image.outputs.map((out) => (
                <div key={out.id} className="group">
                  <div className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden flex items-center justify-center p-1"
                       style={{ aspectRatio: 'auto' }}>
                    {out.previewUrl ? (
                      <img
                        src={out.previewUrl}
                        alt={out.filename}
                        className="max-w-full max-h-32 object-contain"
                      />
                    ) : (
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">No preview</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 text-center truncate" title={out.filename}>
                    {out.size_label || out.ratio_key}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div className="p-3 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-700 mb-2">Delete this image and all outputs?</p>
          <div className="flex gap-2 mb-2">
            <button
              onClick={onConfirmDelete}
              className="text-xs bg-red-600 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
            <button
              onClick={onCancelDelete}
              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
            >
              Cancel
            </button>
          </div>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={skipConfirm}
              onChange={(e) => setSkipConfirm(e.target.checked)}
            />
            Don't ask again
          </label>
        </div>
      )}

      {/* Actions */}
      {!showConfirm && (
        <div className="p-2 border-t border-gray-100 mt-auto flex gap-1">
          <a
            href={`/crop?imageId=${image.id}`}
            className="flex-1 text-center text-xs bg-blue-50 text-blue-700 rounded py-1.5 hover:bg-blue-100"
          >
            {image.status === 'processed' ? 'Re-process' : 'Process'}
          </a>
          {image.status === 'processed' && outputCount > 0 && (
            <a
              href={`/api/download-zip/${image.id}`}
              className="flex-1 text-center text-xs bg-green-50 text-green-700 rounded py-1.5 hover:bg-green-100"
            >
              ZIP
            </a>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-xs bg-red-50 text-red-700 rounded px-2 py-1.5 hover:bg-red-100 disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Del'}
          </button>
        </div>
      )}
    </div>
  );
}
