'use client';

import { useState, useRef, useCallback } from 'react';

const OUTPUT_FORMATS = [
  { value: 'jpg', label: 'JPG', description: 'Smaller file size, no transparency' },
  { value: 'png', label: 'PNG', description: 'Lossless, supports transparency' },
  { value: 'tiff', label: 'TIFF', description: 'High quality, large files' },
  { value: 'webp', label: 'WebP', description: 'Modern web format, small & sharp' },
  { value: 'gif', label: 'GIF', warning: '256 colors — significant quality loss' },
  { value: 'pdf', label: 'PDF', description: 'Embeds image in a PDF document' },
];

const MAX_PDF_PAGES = 20;

export default function ConvertTool() {
  const [state, setState] = useState('idle'); // idle | uploading | options | converting | done | error
  const [dragOver, setDragOver] = useState(false);
  const [job, setJob] = useState(null); // { jobId, sourceFormat, pageCount, pageThumbnailUrls, originalFilename, retentionDays }
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]); // 1-based
  const [outputs, setOutputs] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setState('idle');
    setJob(null);
    setSelectedFormats([]);
    setSelectedPages([]);
    setOutputs([]);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setState('uploading');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/convert/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Upload failed.');
      }
      setJob(data);
      // Default: all pages selected
      if (data.sourceFormat === 'pdf' && data.pageCount > 0) {
        setSelectedPages(Array.from({ length: data.pageCount }, (_, i) => i + 1));
      }
      setState('options');
    } catch (err) {
      setErrorMessage(err.message || 'Upload failed. Please try again.');
      setState('error');
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleFormat = (fmt) => {
    setSelectedFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    );
  };

  const togglePage = (pageNum) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const selectAllPages = () => setSelectedPages(Array.from({ length: job.pageCount }, (_, i) => i + 1));
  const deselectAllPages = () => setSelectedPages([]);

  const handleConvert = async () => {
    if (selectedFormats.length === 0) return;
    if (job.sourceFormat === 'pdf' && selectedPages.length === 0) return;
    setState('converting');
    setErrorMessage('');

    try {
      const body = { jobId: job.jobId, outputFormats: selectedFormats };
      if (job.sourceFormat === 'pdf') {
        body.selectedPages = selectedPages;
      }
      const res = await fetch('/api/convert/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Conversion failed.');
      }
      setOutputs(data.outputs);
      setState('done');
    } catch (err) {
      setErrorMessage(err.message || 'Conversion failed. Please try again.');
      setState('error');
    }
  };

  const downloadOne = (outputId) => {
    window.open(`/api/convert/download/${outputId}`, '_blank');
  };

  const downloadAll = () => {
    window.open(`/api/convert/download-zip/${job.jobId}`, '_blank');
  };

  // ── Idle / drag-drop upload UI ──────────────────────────────────────────
  if (state === 'idle' || state === 'error') {
    return (
      <div className="space-y-4">
        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div
          style={{
            border: dragOver ? '2px dashed var(--agw-red)' : '2px dashed var(--agw-navy)',
            borderRadius: '8px',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(212,74,42,0.06)' : 'white',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tiff,.tif,.webp,.bmp,.gif,.pdf"
            className="hidden"
            onChange={onFileChange}
          />
          <div className="flex flex-col items-center gap-3">
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--agw-navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg style={{ width: '26px', height: '26px' }} fill="none" viewBox="0 0 24 24" stroke="var(--agw-gold)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-sub)', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.04em', color: 'var(--agw-navy)', marginBottom: '0.3rem' }}>
                Drop a file here, or click to choose
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                JPG · PNG · TIFF · WebP · BMP · GIF · PDF &nbsp;·&nbsp; up to 400 MB
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Uploading spinner ───────────────────────────────────────────────────
  if (state === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600">Uploading{job?.sourceFormat === 'pdf' ? ' and generating page previews' : ''}…</p>
      </div>
    );
  }

  // ── Converting spinner ──────────────────────────────────────────────────
  if (state === 'converting') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600">Converting…</p>
      </div>
    );
  }

  // ── Options: format selection (+ page grid for PDF) ─────────────────────
  if (state === 'options') {
    const isPdf = job?.sourceFormat === 'pdf';
    const canConvert = selectedFormats.length > 0 && (!isPdf || selectedPages.length > 0);

    return (
      <div className="space-y-8">
        {/* File info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">File ready to convert</p>
            <p className="font-medium text-gray-900">{job?.originalFilename}</p>
            {job?.retentionDays && (
              <p className="text-xs text-gray-400 mt-0.5">
                Files available for {job.retentionDays} day{job.retentionDays !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-800 underline">
            Choose a different file
          </button>
        </div>

        {/* PDF page selection */}
        {isPdf && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Select pages
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {job.pageCount} page{job.pageCount !== 1 ? 's' : ''}
                  {job.pageCount === MAX_PDF_PAGES ? ` (first ${MAX_PDF_PAGES} shown)` : ''}
                </span>
              </h3>
              <div className="flex gap-3 text-sm">
                <button onClick={selectAllPages} className="text-blue-600 hover:text-blue-800">Select all</button>
                <span className="text-gray-300">|</span>
                <button onClick={deselectAllPages} className="text-blue-600 hover:text-blue-800">Deselect all</button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {Array.from({ length: job.pageCount }, (_, i) => i + 1).map((pageNum) => {
                const thumbUrl = job.pageThumbnailUrls?.[pageNum - 1];
                const isSelected = selectedPages.includes(pageNum);
                return (
                  <button
                    key={pageNum}
                    onClick={() => togglePage(pageNum)}
                    className={`relative rounded-lg border-2 overflow-hidden aspect-[3/4] transition-all ${
                      isSelected
                        ? 'border-blue-500 shadow-md'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={`Page ${pageNum}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs text-gray-400">p{pageNum}</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] text-center py-0.5">
                      {pageNum}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Output format selection */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Convert to</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OUTPUT_FORMATS.filter((f) => {
              // Don't offer same format as source (unless it's PDF input — allow re-encoding)
              const src = job?.sourceFormat;
              const normalised = f.value === 'jpg' ? 'jpeg' : f.value;
              const normSrc = src === 'jpg' ? 'jpeg' : src;
              return normSrc !== normalised;
            }).map((fmt) => {
              const isSelected = selectedFormats.includes(fmt.value);
              return (
                <button
                  key={fmt.value}
                  onClick={() => toggleFormat(fmt.value)}
                  className={`flex flex-col items-start gap-1 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {fmt.label}
                    </span>
                    {fmt.warning && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium leading-none">
                        ⚠ 256 colors
                      </span>
                    )}
                    {isSelected && (
                      <svg className="ml-auto w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 leading-snug">
                    {fmt.warning || fmt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleConvert}
          disabled={!canConvert}
          className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {selectedFormats.length === 0
            ? 'Select at least one format'
            : isPdf && selectedPages.length === 0
            ? 'Select at least one page'
            : `Convert to ${selectedFormats.map((f) => f.toUpperCase()).join(', ')}`}
        </button>
      </div>
    );
  }

  // ── Done: results ────────────────────────────────────────────────────────
  if (state === 'done') {
    // Group outputs by format for display
    const byFormat = {};
    for (const out of outputs) {
      const key = out.outputFormat;
      if (!byFormat[key]) byFormat[key] = [];
      byFormat[key].push(out);
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Conversion complete</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {outputs.length} file{outputs.length !== 1 ? 's' : ''} ready
            </p>
          </div>
          <button onClick={reset} className="text-sm text-blue-600 hover:text-blue-800 underline">
            Convert another file
          </button>
        </div>

        {outputs.length > 1 && (
          <button
            onClick={downloadAll}
            className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            Download all as ZIP ({outputs.length} files)
          </button>
        )}

        <div className="space-y-2">
          {outputs.map((out) => (
            <div
              key={out.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 uppercase flex-shrink-0">
                  {out.outputFormat === 'jpeg' ? 'JPG' : out.outputFormat.toUpperCase()}
                </span>
                <span className="text-sm text-gray-700 truncate">{out.filename}</span>
                {out.pageNumber != null && (
                  <span className="text-xs text-gray-400 flex-shrink-0">page {out.pageNumber}</span>
                )}
              </div>
              <button
                onClick={() => downloadOne(out.id)}
                className="ml-4 flex-shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
