'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function HistoryGrid({ images }) {
  const [search, setSearch] = useState('');
  const [orientationFilter, setOrientationFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('new');

  const filtered = images.filter((img) => {
    const matchesSearch =
      !search || img.original_filename?.toLowerCase().includes(search.toLowerCase());
    const matchesOrientation =
      orientationFilter === 'all' ||
      img.orientation?.toLowerCase() === orientationFilter;
    return matchesSearch && matchesOrientation;
  });

  // If there's a highlighted image, put it first
  const sorted = highlightId
    ? [...filtered].sort((a, b) => {
        if (a.id === highlightId) return -1;
        if (b.id === highlightId) return 1;
        return 0;
      })
    : filtered;

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

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No images match your filters.
        </p>
      ) : (
        <div className="space-y-5">
          {sorted.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              isNew={img.id === highlightId}
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

/* ─── Image Card ─────────────────────────────────────────── */

function ImageCard({
  image,
  isNew,
  onDelete,
  isDeleting,
  showConfirm,
  onCancelDelete,
  onConfirmDelete,
  skipConfirm,
  setSkipConfirm,
}) {
  const [showOutputs, setShowOutputs] = useState(isNew);
  const [groupByRatio, setGroupByRatio] = useState(true);
  const cardRef = useRef(null);

  // Auto-scroll to highlighted card
  useEffect(() => {
    if (isNew && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isNew]);

  const outputCount = image.outputs?.length || 0;
  const statusLabel =
    image.status === 'processed'
      ? `${outputCount} file${outputCount !== 1 ? 's' : ''}`
      : image.status || 'pending';

  // Group outputs by ratio_key
  const groupedOutputs = {};
  if (image.outputs) {
    for (const out of image.outputs) {
      const key = out.ratio_key || 'other';
      if (!groupedOutputs[key]) groupedOutputs[key] = [];
      groupedOutputs[key].push(out);
    }
  }

  const ratioCount = Object.keys(groupedOutputs).length;

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-lg border overflow-hidden transition-all ${
        isNew
          ? 'border-blue-400 ring-2 ring-blue-100 shadow-md'
          : 'border-gray-200'
      }`}
    >
      {/* Header: original image preview + info + actions */}
      <div className="p-4 flex gap-4 items-start">
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
          <div className="flex items-center gap-2">
            <p
              className="text-sm font-medium text-gray-900 truncate"
              title={image.original_filename}
            >
              {image.original_filename}
            </p>
            {isNew && (
              <span className="badge-new">New</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {image.width}&times;{image.height}
            </span>
            <span className="text-xs text-gray-400 capitalize">
              {image.orientation}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(image.created_at).toLocaleDateString()}
            </span>
          </div>
          {image.status === 'processed' && outputCount > 0 && (
            <p className="text-xs text-green-700 mt-1">
              {statusLabel} &middot; {ratioCount} ratio{ratioCount !== 1 ? 's' : ''}
            </p>
          )}
          {image.status !== 'processed' && (
            <p className="text-xs text-yellow-700 mt-1 capitalize">{statusLabel}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-2">
          <a
            href={`/crop?imageId=${image.id}`}
            className="text-xs font-medium bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
          >
            {image.status === 'processed' ? 'Re-process' : 'Process'}
          </a>
          {image.status === 'processed' && outputCount > 0 && (
            <a
              href={`/api/download-zip/${image.id}`}
              className="text-xs font-medium bg-green-50 text-green-700 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-colors"
            >
              Download ZIP
            </a>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-xs font-medium bg-red-50 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showConfirm && (
        <div className="px-4 pb-3 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-700 py-2">
            Delete this image and all {outputCount} output{outputCount !== 1 ? 's' : ''}?
          </p>
          <div className="flex gap-2 mb-2">
            <button
              onClick={onConfirmDelete}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg"
            >
              Confirm Delete
            </button>
            <button
              onClick={onCancelDelete}
              className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg"
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
            Don&apos;t ask again
          </label>
        </div>
      )}

      {/* Outputs section */}
      {outputCount > 0 && !showConfirm && (
        <div className="border-t border-gray-100">
          {/* Toggle bar */}
          <button
            onClick={() => setShowOutputs(!showOutputs)}
            className="w-full px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center justify-between transition-colors"
          >
            <span className="font-medium">
              {outputCount} output{outputCount !== 1 ? 's' : ''}
              {ratioCount > 1 ? ` across ${ratioCount} ratios` : ''}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${
                showOutputs ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Expanded outputs */}
          {showOutputs && (
            <div className="px-4 pb-4">
              {/* Group toggle (only if multiple ratios) */}
              {ratioCount > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setGroupByRatio(true)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      groupByRatio
                        ? 'bg-gray-200 text-gray-800 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Group by ratio
                  </button>
                  <button
                    onClick={() => setGroupByRatio(false)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      !groupByRatio
                        ? 'bg-gray-200 text-gray-800 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    All files
                  </button>
                </div>
              )}

              {groupByRatio && ratioCount > 1 ? (
                /* Grouped by ratio */
                <div className="space-y-4">
                  {Object.entries(groupedOutputs).map(([ratioKey, ratioOutputs]) => (
                    <div key={ratioKey}>
                      <h3 className="text-xs font-semibold text-gray-700 mb-2 capitalize">
                        {formatRatioLabel(ratioKey)}
                        <span className="font-normal text-gray-400 ml-1.5">
                          ({ratioOutputs.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {ratioOutputs.map((out) => (
                          <OutputTile key={out.id} output={out} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Flat list */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {image.outputs.map((out) => (
                    <OutputTile key={out.id} output={out} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Output Tile ────────────────────────────────────────── */

function OutputTile({ output }) {
  const ext = output.format === 'png' ? 'PNG' : 'JPG';

  return (
    <div className="group relative">
      {/* Thumbnail */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center p-1 aspect-[4/3] hover:border-blue-300 transition-colors">
        {output.previewUrl ? (
          <img
            src={output.previewUrl}
            alt={output.filename}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-gray-400">No preview</span>
          </div>
        )}

        {/* Download overlay on hover */}
        <a
          href={`/api/download/${output.id}`}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-lg"
          title={`Download ${output.filename}`}
        >
          <svg
            className="w-6 h-6 text-white drop-shadow-md"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </a>
      </div>

      {/* Label */}
      <div className="mt-1.5 text-center">
        <p
          className="text-[11px] font-medium text-gray-700 truncate"
          title={output.size_label || output.filename}
        >
          {output.size_label || output.ratio_key}
        </p>
        <span className="text-[10px] text-gray-400">{ext}</span>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function formatRatioLabel(ratioKey) {
  // Convert ratio_key like "2_3" or "portrait_2_3" to readable label
  const cleaned = ratioKey
    .replace(/^(portrait|landscape)_/, '')
    .replace(/_/g, ':');
  const labels = {
    '2:3': '2:3 Ratio',
    '3:4': '3:4 Ratio',
    '4:5': '4:5 Ratio',
    '8:11': '8:11 Ratio (Letter)',
    'a:series': 'A-Series (ISO 216)',
    'a-series': 'A-Series (ISO 216)',
  };
  return labels[cleaned.toLowerCase()] || cleaned;
}
