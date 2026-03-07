'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getImageSpecs } from '@/lib/output-sizes';

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
  const [showMockups, setShowMockups] = useState(false);
  const [mockups, setMockups] = useState(image.mockups || []);
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [groupByRatio, setGroupByRatio] = useState(true);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const cardRef = useRef(null);

  async function handleGenerateMockup() {
    setGeneratingMockup(true);
    try {
      const res = await fetch('/api/mockup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: image.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to generate mockup');
      setMockups((prev) => [{ id: json.mockupOutputId, previewUrl: json.url }, ...prev]);
      setShowMockups(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingMockup(false);
    }
  }

  // Auto-scroll to highlighted card
  useEffect(() => {
    if (isNew && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isNew]);

  const isExpired = !!image.expired_at;
  const outputCount = image.outputs?.length || 0;

  // Expiry info for active images that have an expires_at
  let expiryLabel = null;
  let expiryDaysLeft = 0;
  if (!isExpired && image.expires_at) {
    expiryDaysLeft = Math.ceil(
      (new Date(image.expires_at) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const dateStr = new Date(image.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    expiryLabel = expiryDaysLeft <= 7
      ? `Expires in ${expiryDaysLeft} day${expiryDaysLeft !== 1 ? 's' : ''}`
      : `Files expire ${dateStr}`;
  }

  const statusLabel =
    image.status === 'processed'
      ? `${outputCount} file${outputCount !== 1 ? 's' : ''}`
      : image.status || 'pending';

  // Sort outputs by date
  const sortedOutputs = image.outputs
    ? [...image.outputs].sort((a, b) => {
        const da = new Date(a.created_at || 0);
        const db = new Date(b.created_at || 0);
        return sortNewestFirst ? db - da : da - db;
      })
    : [];

  // Determine which outputs are from the latest batch (for "New" badges)
  // Only badge outputs created within 60s of the newest output
  const newOutputIds = new Set();
  if (isNew && sortedOutputs.length > 0) {
    const timestamps = sortedOutputs.map((o) => new Date(o.created_at || 0).getTime());
    const latest = Math.max(...timestamps);
    for (const out of sortedOutputs) {
      const t = new Date(out.created_at || 0).getTime();
      if (latest - t < 60_000) newOutputIds.add(out.id);
    }
  }

  // Group outputs by ratio_key
  const groupedOutputs = {};
  for (const out of sortedOutputs) {
    const key = out.ratio_key || 'other';
    if (!groupedOutputs[key]) groupedOutputs[key] = [];
    groupedOutputs[key].push(out);
  }

  const ratioCount = Object.keys(groupedOutputs).length;

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-lg border overflow-hidden transition-all ${
        isNew
          ? 'border-blue-400 ring-2 ring-blue-100 shadow-md'
          : isExpired
          ? 'border-gray-200 opacity-70'
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
            {isNew && <span className="badge-new">New</span>}
            {isExpired && (
              <span className="text-[10px] font-medium bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                Expired
              </span>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1 text-[11px]">
            {(() => {
              const specs = getImageSpecs(image.width, image.height);
              return (
                <>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-slate-100 text-slate-600">{image.width}&times;{image.height}px</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-violet-100 text-violet-700">Ratio {specs.ratioStr}</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-sky-100 text-sky-700">{specs.wIn} x {specs.hIn} in.</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-teal-100 text-teal-700">{specs.wCm} x {specs.hCm} cm</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-gray-100 text-gray-500 capitalize">{image.orientation}</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-gray-100 text-gray-500">{new Date(image.created_at).toLocaleDateString()}</span>
                </>
              );
            })()}
          </div>
          {!isExpired && image.status === 'processed' && outputCount > 0 && (
            <p className="text-xs text-green-700 mt-1">
              {statusLabel} &middot; {ratioCount} ratio{ratioCount !== 1 ? 's' : ''}
            </p>
          )}
          {!isExpired && image.status !== 'processed' && (
            <p className="text-xs text-yellow-700 mt-1 capitalize">{statusLabel}</p>
          )}
          {isExpired && (
            <p className="text-xs text-gray-400 mt-1">Files deleted &mdash; upload again to re-create</p>
          )}
          {!isExpired && expiryLabel && (
            <p className={`text-[11px] mt-1 font-medium ${expiryDaysLeft <= 2 ? 'text-orange-600' : expiryDaysLeft <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>
              {expiryLabel}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-2">
          {isExpired ? (
            <a
              href="/"
              className="text-xs font-medium bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
            >
              Upload New
            </a>
          ) : (
            <a
              href={`/crop?imageId=${image.id}`}
              className="text-xs font-medium bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
            >
              {image.status === 'processed' ? 'Re-process' : 'Process'}
            </a>
          )}
          {!isExpired && image.status === 'processed' && outputCount > 0 && (
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

      {/* Mockups section */}
      {!isExpired && image.status === 'processed' && outputCount > 0 && !showConfirm && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowMockups(!showMockups)}
            className="w-full px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center justify-between transition-colors"
          >
            <span className="font-medium">
              {mockups.length > 0
                ? `${mockups.length} mockup${mockups.length !== 1 ? 's' : ''}`
                : 'Mockups'}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showMockups ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMockups && (
            <div className="px-4 pb-4">
              {mockups.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-400 mb-3">No mockups yet</p>
                  <button
                    onClick={handleGenerateMockup}
                    disabled={generatingMockup}
                    className="text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {generatingMockup ? 'Generating…' : 'Generate Mockup'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                    {mockups.map((mockup) => (
                      <div key={mockup.id} className="group relative">
                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden aspect-[4/3] hover:border-indigo-300 transition-colors">
                          {mockup.previewUrl ? (
                            <img
                              src={mockup.previewUrl}
                              alt="Mockup"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-[10px] text-gray-400">No preview</span>
                            </div>
                          )}
                          {mockup.previewUrl && (
                            <a
                              href={mockup.previewUrl}
                              download={`mockup_${mockup.id}.jpg`}
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                              title="Download mockup"
                            >
                              <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleGenerateMockup}
                    disabled={generatingMockup}
                    className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    {generatingMockup ? 'Generating…' : '+ Generate another mockup'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Outputs section */}
      {!isExpired && outputCount > 0 && !showConfirm && (
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
              {/* Toolbar: group toggle + sort toggle */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {ratioCount > 1 && (
                  <>
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
                    <span className="text-gray-300">|</span>
                  </>
                )}
                <button
                  onClick={() => setSortNewestFirst(true)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    sortNewestFirst
                      ? 'bg-gray-200 text-gray-800 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Newest first
                </button>
                <button
                  onClick={() => setSortNewestFirst(false)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    !sortNewestFirst
                      ? 'bg-gray-200 text-gray-800 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Oldest first
                </button>
              </div>

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
                          <OutputTile key={out.id} output={out} isNew={newOutputIds.has(out.id)} expiresAt={image.expires_at} isExpired={isExpired} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Flat list */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {sortedOutputs.map((out) => (
                    <OutputTile key={out.id} output={out} isNew={newOutputIds.has(out.id)} expiresAt={image.expires_at} isExpired={isExpired} />
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

// Parse dimensions from the output filename which encodes everything:
// e.g. "3x4-8x10in-2400x3000px-203x254mm-1234567890.jpg"
// or   "a4-8.27x11.69in-2481x3507px-210x297mm-1234567890.jpg"
function parseFilnameDimensions(filename) {
  if (!filename) return {};
  const inMatch = filename.match(/([\d.]+)x([\d.]+)in/);
  const pxMatch = filename.match(/([\d.]+)x([\d.]+)px/);
  const mmMatch = filename.match(/([\d.]+)x([\d.]+)mm/);
  return {
    wIn: inMatch ? parseFloat(inMatch[1]) : null,
    hIn: inMatch ? parseFloat(inMatch[2]) : null,
    wPx: pxMatch ? parseInt(pxMatch[1]) : null,
    hPx: pxMatch ? parseInt(pxMatch[2]) : null,
    wMm: mmMatch ? parseInt(mmMatch[1]) : null,
    hMm: mmMatch ? parseInt(mmMatch[2]) : null,
  };
}

function OutputTile({ output, isNew, expiresAt, isExpired }) {
  const ext = output.format === 'png' ? 'PNG' : 'JPG';
  const dpi = output.dpi || 300;

  // Parse all dimensions from the filename (source of truth)
  const dims = parseFilnameDimensions(output.filename || output.storage_path);

  const inLabel = dims.wIn != null ? `${dims.wIn} × ${dims.hIn} in` : null;
  const pxLabel = dims.wPx != null ? `${dims.wPx} × ${dims.hPx} px` : null;
  const cmLabel = dims.wMm != null
    ? `${(dims.wMm / 10).toFixed(1)} × ${(dims.hMm / 10).toFixed(1)} cm`
    : null;

  // Show a ratio badge when size_label is not already in "WxH" integer form (e.g. A-Series labels like "A0")
  let ratioLabel = null;
  const isNumericSizeLabel = output.size_label && /^[\d.]+x[\d.]+$/i.test(output.size_label);
  if (!isNumericSizeLabel && dims.wIn != null && dims.hIn != null) {
    const r = dims.wIn / dims.hIn;
    const fmt = (n) => Number.isInteger(n) ? `${n}` : n.toFixed(1);
    // Express as W:H normalised so the smaller side is 1 if ratio < 1, else H is 1
    ratioLabel = r <= 1 ? `${fmt(r * (1 / r))}:${fmt(1 / r * r / r)}` : `${fmt(r)}:1`;
    // Simpler: just show W/H reduced nicely
    const gcd = (a, b) => b < 0.001 ? a : gcd(b, a % b);
    const g = gcd(dims.wIn, dims.hIn);
    const rw = dims.wIn / g;
    const rh = dims.hIn / g;
    const fmtR = (n) => {
      const rounded = Math.round(n * 10) / 10;
      return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
    };
    ratioLabel = `${fmtR(rw)}:${fmtR(rh)}`;
  }

  // Expiry badge
  let expiryBadge = null;
  if (!isExpired && expiresAt) {
    const daysLeft = Math.ceil((new Date(expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
    const dateStr = new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const cls = daysLeft <= 2
      ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
      : daysLeft <= 7
      ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'
      : 'bg-gray-100 text-gray-500';
    expiryBadge = (
      <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${cls}`} title={`Files expire ${new Date(expiresAt).toLocaleDateString()}`}>
        Exp. {dateStr}
      </span>
    );
  }

  return (
    <div className="group relative">
      {/* New badge */}
      {isNew && (
        <span className="badge-new absolute top-1.5 right-1.5 z-10 text-[9px] px-1.5 py-0.5">New</span>
      )}
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
      <div className="mt-1.5">
        <p
          className="text-[11px] font-semibold text-gray-800 truncate text-center"
          title={output.size_label || output.filename}
        >
          {output.size_label || output.ratio_key}
        </p>
        <div className="flex flex-wrap gap-1 mt-1 justify-center">
          {ratioLabel && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700">
              {ratioLabel}
            </span>
          )}
          {inLabel && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-sky-100 text-sky-700">
              {inLabel}
            </span>
          )}
          {cmLabel && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-teal-100 text-teal-700">
              {cmLabel}
            </span>
          )}
          {pxLabel && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600">
              {pxLabel}
            </span>
          )}
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700">
            {dpi} DPI
          </span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500">
            {ext}
          </span>
          {expiryBadge}
        </div>
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
