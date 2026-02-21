'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tiff', 'webp', 'bmp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function UploadForm({ isLoggedIn, isActive, hasCredits }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
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
      return `File too large. Maximum size: 50MB. Your file: ${(f.size / 1024 / 1024).toFixed(1)}MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((f) => {
    setError(null);
    setMetadata(null);
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setFile(f);
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
            </p>
            {metadata && (
              <p className="text-sm text-gray-500 mt-1">
                {metadata.width}×{metadata.height}px · {metadata.orientation} · {metadata.format}
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-1">
              <span className="font-medium text-blue-600">Click to browse</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              JPG, PNG, TIFF, WebP, BMP — up to 50MB
            </p>
          </div>
        )}
      </div>

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
