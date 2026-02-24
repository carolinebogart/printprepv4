'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tiff', 'webp', 'bmp'];
const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB

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
      return `File too large. Maximum size: 300MB. Your file: ${(f.size / 1024 / 1024).toFixed(1)}MB`;
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
        setResolution({ width: img.width, height: img.height, tier });
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
              JPG, PNG, TIFF, WebP, BMP — up to 300MB
            </p>
          </div>
        )}
      </div>

      {/* Resolution assessment */}
      {resolution && resolution.tier && (
        <div className={`rounded-lg border p-3 text-sm ${
          resolution.tier.color === 'green' ? 'bg-green-50 border-green-200 text-green-800' :
          resolution.tier.color === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          resolution.tier.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="font-semibold mb-1">
            {resolution.tier.color === 'green' ? '✓' : resolution.tier.color === 'yellow' ? '⚠' : '⚠'} Resolution: {resolution.tier.label}
          </p>
          {(resolution.tier.color === 'orange' || resolution.tier.color === 'red') && (
            <div className="text-xs mt-1 space-y-1 opacity-90">
              <p>Print-quality output requires 300 pixels per inch. For example, an 8×10&quot; print needs 2400×3000px.</p>
              <p>You can still upload this image, but larger print sizes will be unavailable or reduced quality.</p>
              {resolution.tier.color === 'red' && (
                <p className="font-medium">Consider using a higher-resolution source image to get the best results.</p>
              )}
            </div>
          )}
          {resolution.tier.color === 'yellow' && (
            <p className="text-xs mt-1 opacity-90">
              Larger sizes (16×20&quot; and above) may show reduced quality. Smaller prints will look great.
            </p>
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
