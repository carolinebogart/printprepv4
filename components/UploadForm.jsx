'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PORTRAIT_RATIOS, LANDSCAPE_RATIOS } from '@/lib/output-sizes';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tiff', 'webp', 'bmp'];
const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB

// Resolution thresholds for print quality (300 DPI)
// Short side of image determines what print sizes are possible
const RES_TIERS = [
  { minShort: 3600, label: 'High resolution — supports large prints. Check DPI per size on the next page.', color: 'green' },
  { minShort: 2400, label: 'Good resolution — supports medium prints up to ~16×20" at 150+ DPI', color: 'green' },
  { minShort: 1800, label: 'Fair — supports sizes up to ~8×12" at 150+ DPI', color: 'yellow' },
  { minShort: 1200, label: 'Limited — only small prints (4×6", 4×5")', color: 'orange' },
  { minShort: 0, label: 'Very low — may not produce print-quality output at any size', color: 'red' },
];

function getResolutionTier(width, height) {
  const shortSide = Math.min(width, height);
  return RES_TIERS.find((t) => shortSide >= t.minShort);
}

function getQualityBadge(srcW, srcH, targetWIn, targetHIn) {
  const effectiveDPI = Math.min(srcW / targetWIn, srcH / targetHIn);
  if (effectiveDPI >= 300) return { label: 'Excellent', tier: 'excellent', dpi: Math.round(effectiveDPI) };
  if (effectiveDPI >= 200) return { label: 'Good',      tier: 'good',      dpi: Math.round(effectiveDPI) };
  if (effectiveDPI >= 150) return { label: 'Fair',      tier: 'fair',      dpi: Math.round(effectiveDPI) };
  if (effectiveDPI >= 35)  return { label: 'AI Upscale', tier: 'upscale', dpi: Math.round(effectiveDPI), estimatedDpi: Math.min(Math.round(effectiveDPI * 4), 300) };
  return { label: 'Unavailable', tier: 'disabled', dpi: Math.round(effectiveDPI) };
}

function getCropSourceDims(imgW, imgH, targetRatio) {
  const imgRatio = imgW / imgH;
  if (targetRatio < imgRatio - 0.01) return { w: Math.round(imgH * targetRatio), h: imgH };
  if (targetRatio > imgRatio + 0.01) return { w: imgW, h: Math.round(imgW / targetRatio) };
  return { w: imgW, h: imgH };
}

function computeQualityData(imgW, imgH) {
  const ratios = imgW >= imgH ? LANDSCAPE_RATIOS : PORTRAIT_RATIOS;
  return Object.entries(ratios).map(([key, def]) => {
    const crop = getCropSourceDims(imgW, imgH, def.ratio);
    return {
      key,
      name: def.name,
      sizes: def.sizes.map((s) => ({ label: s.label, badge: getQualityBadge(crop.w, crop.h, s.width, s.height) })),
    };
  });
}

const TIER_COLS = [
  { tier: 'excellent', label: 'Excellent',   classes: 'text-green-700 bg-green-50 border-green-200'  },
  { tier: 'good',      label: 'Good',        classes: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { tier: 'fair',      label: 'Fair',        classes: 'text-orange-600 bg-orange-50 border-orange-200' },
  { tier: 'upscale',   label: 'AI Upscale ✦', classes: 'text-blue-700 bg-blue-50 border-blue-200'   },
  { tier: 'disabled',  label: 'Unavailable', classes: 'text-gray-400 bg-gray-50 border-gray-200'    },
];

function QualityPreviewTable({ qualityData }) {
  const hasUpscale = qualityData.some((r) => r.sizes.some((s) => s.badge.tier === 'upscale'));

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">Expected output quality by ratio</p>
      {qualityData.map((ratio) => {
        const visibleCols = TIER_COLS.filter((col) => ratio.sizes.some((s) => s.badge.tier === col.tier));
        if (visibleCols.length === 0) return null;

        return (
          <div key={ratio.key} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5">
              <span className="text-xs font-semibold text-gray-700">{ratio.name}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {visibleCols.map((col) => (
                      <th key={col.tier} className={`px-2 py-1.5 text-left font-medium border-b border-gray-200 ${col.classes}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {visibleCols.map((col) => {
                      const sizes = ratio.sizes.filter((s) => s.badge.tier === col.tier);
                      return (
                        <td key={col.tier} className="px-2 py-2 align-top text-gray-700">
                          {sizes.length > 0
                            ? sizes.map((s) => (
                                <div key={s.label}>
                                  {s.label}&quot;
                                  {s.badge.tier === 'upscale' && (
                                    <span className="text-gray-400 ml-1">~{s.badge.estimatedDpi} DPI</span>
                                  )}
                                </div>
                              ))
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {hasUpscale && (
        <p className="text-xs text-gray-400 px-1">
          ✦ AI Upscale: we will attempt to enhance the image using AI before processing. Estimated result shown.
        </p>
      )}
    </div>
  );
}

export default function UploadForm({ isLoggedIn, isActive, hasCredits }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [resolution, setResolution] = useState(null); // { width, height, tier }
  const fileInputRef = useRef(null);
  const router = useRouter();

  const canUpload = isLoggedIn && isActive && hasCredits;

  const validateFile = useCallback((f) => {
    if (!f || !f.name) return 'Please select a file.';
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 400MB. Your file: ${(f.size / 1024 / 1024).toFixed(1)}MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((f) => {
    setError(null);
    setMetadata(null);
    setResolution(null);
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);

    // Read image dimensions client-side for resolution check
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const tier = getResolutionTier(img.width, img.height);
        setResolution({ width: img.width, height: img.height, tier, qualityData: computeQualityData(img.width, img.height) });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    }
  }, [validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file || !canUpload) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed. Please try again.');
        return;
      }

      setMetadata(data.metadata);
      // Navigate to crop page with the image ID
      router.push(`/crop?imageId=${data.imageId}`);
    } catch {
      setError('Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
        />

        {file ? (
          <div>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
              {resolution && <span> · {resolution.width}×{resolution.height}px</span>}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-1">
              <span className="font-medium text-blue-600">Click to browse</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              JPG, PNG, TIFF, WebP, BMP — up to 400MB
            </p>
          </div>
        )}
      </div>

      {/* Resolution assessment */}
      {resolution && resolution.tier && (
        <div className="space-y-3 text-sm">
          {/* Tier badge */}
          <div className={`rounded-lg border p-3 ${
            resolution.tier.color === 'green' ? 'bg-green-50 border-green-200 text-green-800' :
            resolution.tier.color === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            resolution.tier.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-800' :
            'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-semibold">
              {resolution.tier.color === 'green' ? '✓' : '⚠'} Resolution: {resolution.tier.label}
            </p>
          </div>

          {/* Pixel + print dimensions */}
          <div className="text-gray-600 text-xs px-1">
            <span className="font-medium text-gray-800">{resolution.width} × {resolution.height} px</span>
            {' · '}
            {(resolution.width / 300).toFixed(1)}&quot; × {(resolution.height / 300).toFixed(1)}&quot;
            {' '}
            <span className="text-gray-400">({(resolution.width / 300 * 2.54).toFixed(1)} × {(resolution.height / 300 * 2.54).toFixed(1)} cm)</span>
            {' '}
            <span className="text-gray-400">native print size at 300 DPI</span>
          </div>

          {/* Per-ratio quality table */}
          {resolution.qualityData && (
            <QualityPreviewTable qualityData={resolution.qualityData} />
          )}
        </div>
      )}

      {/* Error message */}
      {error && <div className="flash-error">{error}</div>}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || !canUpload || uploading}
        className="btn-primary w-full py-3 text-base"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading...
          </span>
        ) : (
          'Upload & Start Cropping'
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Output: 300 DPI, print-ready files
      </p>
    </div>
  );
}
