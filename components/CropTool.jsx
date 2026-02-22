'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

export default function CropTool({
  imageId,
  imageUrl,
  originalFilename,
  originalWidth,
  originalHeight,
  originalRatio,
  orientation,
  ratios,
}) {
  const router = useRouter();
  const cropperRef = useRef(null);

  // Which ratios are selected
  const [selectedRatios, setSelectedRatios] = useState(() =>
    ratios.reduce((acc, r) => ({ ...acc, [r.key]: false }), {})
  );

  // Current ratio being edited
  const [activeRatio, setActiveRatio] = useState(null);

  // Per-ratio crop state
  const [cropStates, setCropStates] = useState(() =>
    ratios.reduce((acc, r) => ({
      ...acc,
      [r.key]: {
        canvasData: null,
        cropBoxData: null,
        sizes: r.sizes,
        backgroundColor: '#FFFFFF',
        useShadow: false,
      },
    }), {})
  );

  // Eyedropper
  const [eyedropperActive, setEyedropperActive] = useState(false);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // (DPI badges now use original image dimensions directly)

  // Get ordered list of selected ratios
  const selectedRatioKeys = ratios
    .filter((r) => selectedRatios[r.key])
    .map((r) => r.key);

  const currentIndex = selectedRatioKeys.indexOf(activeRatio);

  // Index of active ratio in the full list (for prev/next cycling through all)
  const allRatioKeys = ratios.map((r) => r.key);
  const activeIndexAll = allRatioKeys.indexOf(activeRatio);

  // Save current crop state before switching
  const saveCropState = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || !activeRatio) return;

    setCropStates((prev) => ({
      ...prev,
      [activeRatio]: {
        ...prev[activeRatio],
        canvasData: cropper.getCanvasData(),
        cropBoxData: cropper.getCropBoxData(),
      },
    }));
  }, [activeRatio]);

  // Switch to a ratio
  const switchToRatio = useCallback((ratioKey) => {
    saveCropState();
    setActiveRatio(ratioKey);
  }, [saveCropState]);

  // Restore crop state when ratio changes
  useEffect(() => {
    if (!activeRatio) return;
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const ratio = ratios.find((r) => r.key === activeRatio);
    if (!ratio) return;

    // Set aspect ratio
    cropper.setAspectRatio(ratio.ratio);

    // Restore saved state if exists
    const state = cropStates[activeRatio];
    if (state.canvasData) {
      setTimeout(() => {
        const c = cropperRef.current?.cropper;
        if (!c) return;
        try {
          c.setCanvasData(state.canvasData);
          if (state.cropBoxData) c.setCropBoxData(state.cropBoxData);
        } catch (err) {
          // Cropper not ready yet — ignore
        }
      }, 50);
    }
  }, [activeRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle ratio selection — always switch focus to the toggled-on ratio
  const toggleRatio = (key) => {
    setSelectedRatios((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key]) {
        // Turning on — always switch focus to this ratio
        saveCropState();
        setActiveRatio(key);
      } else if (activeRatio === key) {
        // Turning off the active ratio — switch to next selected
        const remaining = ratios.filter((r) => next[r.key]).map((r) => r.key);
        setActiveRatio(remaining[0] || null);
      }
      return next;
    });
  };

  // Toggle size selection within a ratio
  const toggleSize = (ratioKey, sizeIndex) => {
    setCropStates((prev) => {
      const sizes = [...prev[ratioKey].sizes];
      sizes[sizeIndex] = { ...sizes[sizeIndex], selected: !sizes[sizeIndex].selected };
      return { ...prev, [ratioKey]: { ...prev[ratioKey], sizes } };
    });
  };

  // Background color
  const setBackgroundColor = (ratioKey, color) => {
    setCropStates((prev) => ({
      ...prev,
      [ratioKey]: { ...prev[ratioKey], backgroundColor: color },
    }));
  };

  // Shadow toggle
  const toggleShadow = (ratioKey) => {
    setCropStates((prev) => ({
      ...prev,
      [ratioKey]: { ...prev[ratioKey], useShadow: !prev[ratioKey].useShadow },
    }));
  };

  // Eyedropper: pick color from image via overlay click
  const handleEyedropper = useCallback((e) => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || !activeRatio) return;

    // Get the cropper container to calculate relative position
    const cropperElement = cropperRef.current?.cropper?.element?.parentElement;
    if (!cropperElement) return;

    const rect = cropperElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Get canvas and image data positions from cropper
    const canvasData = cropper.getCanvasData();
    const imageData = cropper.getImageData();

    // Convert click coords to image pixel coords
    const imgX = (clickX - canvasData.left) * (imageData.naturalWidth / canvasData.width);
    const imgY = (clickY - canvasData.top) * (imageData.naturalHeight / canvasData.height);

    // Bounds check — click must be on the actual image
    if (imgX < 0 || imgY < 0 || imgX >= imageData.naturalWidth || imgY >= imageData.naturalHeight) {
      setEyedropperActive(false);
      return;
    }

    // Draw the full image onto a temp canvas and sample the pixel
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.naturalWidth;
    tempCanvas.height = imageData.naturalHeight;
    const ctx = tempCanvas.getContext('2d');

    // Get the image element from cropper
    const img = cropperElement.querySelector('img');
    if (!img) {
      setEyedropperActive(false);
      return;
    }

    try {
      ctx.drawImage(img, 0, 0, imageData.naturalWidth, imageData.naturalHeight);
      const pixel = ctx.getImageData(Math.floor(imgX), Math.floor(imgY), 1, 1).data;
      const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
      setBackgroundColor(activeRatio, hex);
    } catch (err) {
      console.warn('Eyedropper: could not sample pixel', err);
    }
    setEyedropperActive(false);
  }, [activeRatio]);

  // Navigation — cycle through ALL ratios (not just selected)
  const goNext = () => {
    if (activeIndexAll < allRatioKeys.length - 1) {
      const nextKey = allRatioKeys[activeIndexAll + 1];
      saveCropState();
      // Auto-select the ratio if not already selected
      if (!selectedRatios[nextKey]) {
        setSelectedRatios((prev) => ({ ...prev, [nextKey]: true }));
      }
      setActiveRatio(nextKey);
    }
  };

  const goPrev = () => {
    if (activeIndexAll > 0) {
      const prevKey = allRatioKeys[activeIndexAll - 1];
      saveCropState();
      if (!selectedRatios[prevKey]) {
        setSelectedRatios((prev) => ({ ...prev, [prevKey]: true }));
      }
      setActiveRatio(prevKey);
    }
  };



  // Zoom controls — always zoom from center of crop box so image stays centered
  const zoomIn = () => cropperRef.current?.cropper?.zoom(0.1);
  const zoomOut = () => cropperRef.current?.cropper?.zoom(-0.1);
  const resetCrop = () => cropperRef.current?.cropper?.reset();

  // Intercept mouse wheel to zoom from center instead of cursor position
  const cropperContainerRef = useRef(null);
  const handleCropperWheel = useCallback((e) => {
    e.preventDefault();
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    cropper.zoom(delta);
  }, []);

  // Attach wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = cropperContainerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleCropperWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleCropperWheel);
  }, [handleCropperWheel]);

  // Generate all outputs
  const handleGenerate = async () => {
    saveCropState();
    setProcessing(true);
    setError(null);

    // Collect crop data for all selected ratios
    const cropper = cropperRef.current?.cropper;
    const allCropData = [];

    for (const ratioKey of selectedRatioKeys) {
      const state = cropStates[ratioKey];
      const selectedSizes = state.sizes.filter((s) => s.selected);
      if (selectedSizes.length === 0) continue;

      // Get crop box data — we need to switch to each ratio to get accurate data
      // For the active ratio, get it live; for others, use saved state
      let cropData;
      if (ratioKey === activeRatio && cropper) {
        const cd = cropper.getData();
        cropData = { x: cd.x, y: cd.y, width: cd.width, height: cd.height };
      } else if (state.cropBoxData && state.canvasData) {
        // Reconstruct crop coordinates from saved cropper state
        // canvasData has { left, top, width, height, naturalWidth, naturalHeight }
        // cropBoxData has { left, top, width, height } in screen pixels
        const scaleX = state.canvasData.naturalWidth / state.canvasData.width;
        const scaleY = state.canvasData.naturalHeight / state.canvasData.height;
        cropData = {
          x: (state.cropBoxData.left - state.canvasData.left) * scaleX,
          y: (state.cropBoxData.top - state.canvasData.top) * scaleY,
          width: state.cropBoxData.width * scaleX,
          height: state.cropBoxData.height * scaleY,
        };
      } else {
        continue;
      }

      allCropData.push({
        ratioKey,
        cropData,
        sizes: selectedSizes.map((s) => ({
          width: s.width,
          height: s.height,
          label: s.label,
        })),
        backgroundColor: state.backgroundColor,
        useShadow: state.useShadow,
      });
    }

    if (allCropData.length === 0) {
      setError('No sizes selected. Please select at least one size.');
      setProcessing(false);
      return;
    }

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, cropConfigs: allCropData }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Processing failed.');
        setProcessing(false);
        return;
      }

      // Signal the header credits badge to refresh
      window.dispatchEvent(new Event('credits-updated'));
      router.push(`/download?imageId=${imageId}`);
    } catch {
      setError('Processing failed. Please try again.');
      setProcessing(false);
    }
  };

  const activeRatioData = ratios.find((r) => r.key === activeRatio);
  const activeState = activeRatio ? cropStates[activeRatio] : null;

  // Sacrifice direction
  const sacrificeDir = activeRatioData
    ? getSacrificeDir(originalRatio, activeRatioData.ratio)
    : 'none';

  // Count total selected (non-disabled) sub-sizes across all selected ratios
  // Use original image dimensions for DPI — represents max quality for each size
  const totalSelectedSizes = selectedRatioKeys.reduce((count, key) =>
    count + cropStates[key].sizes.filter((size) => {
      const badge = getQualityBadge(originalWidth, originalHeight, size.width, size.height);
      return size.selected && !badge.disabled;
    }).length, 0);

  // Check if any sizes across selected ratios are disabled due to low DPI
  const hasDisabledSizes = ratios.some((r) =>
    cropStates[r.key].sizes.some((size) =>
      getQualityBadge(originalWidth, originalHeight, size.width, size.height).disabled
    )
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
      {/* Left sidebar — ratio selection */}
      <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto p-4 flex-shrink-0">
        <h2 className="font-semibold text-gray-900 mb-3">Select Ratios</h2>

        {ratios.map((r) => (
          <div key={r.key} className="mb-3">
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
              onClick={() => {
                if (selectedRatios[r.key] && activeRatio === r.key) {
                  // Already active — toggle off
                  toggleRatio(r.key);
                } else if (selectedRatios[r.key]) {
                  // Selected but not active — switch focus
                  switchToRatio(r.key);
                } else {
                  // Not selected — toggle on
                  toggleRatio(r.key);
                }
              }}
            >
              <input
                type="checkbox"
                checked={selectedRatios[r.key]}
                onChange={() => {}}
                className="rounded border-gray-300 pointer-events-none"
                tabIndex={-1}
              />
              <span
                className={`text-sm font-medium ${
                  activeRatio === r.key ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {r.name}
              </span>
            </div>

            {/* Size checkboxes — always visible so user sees all options */}
            {
              <div className="ml-6 mt-1 space-y-1">
                {cropStates[r.key].sizes.map((size, i) => {
                  const badge = getQualityBadge(originalWidth, originalHeight, size.width, size.height);
                  return (
                    <div
                      key={size.label}
                      className={`flex items-center gap-1.5 rounded px-1 -mx-1 cursor-pointer hover:bg-gray-50 ${badge.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (badge.disabled) return;
                        // If ratio isn't selected yet, turn it on and switch focus
                        if (!selectedRatios[r.key]) {
                          toggleRatio(r.key);
                        } else if (activeRatio !== r.key) {
                          switchToRatio(r.key);
                        }
                        toggleSize(r.key, i);
                      }}
                    >
                      <span className={`flex items-center gap-1.5 text-xs ${badge.disabled ? 'text-gray-400' : 'text-gray-600'}`}>
                        <input
                          type="checkbox"
                          checked={!!(size.selected && !badge.disabled)}
                          onChange={() => {}}
                          disabled={badge.disabled}
                          className="rounded border-gray-300 pointer-events-none"
                          tabIndex={-1}
                        />
                        {size.label}&quot;
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.color}`}>
                        {badge.dpi} DPI · {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            }
          </div>
        ))}

        {/* Background options — always visible */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Background</h3>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="color"
              value={(activeState?.backgroundColor ?? '#FFFFFF') === 'transparent' ? '#ffffff' : (activeState?.backgroundColor ?? '#FFFFFF')}
              onChange={(e) => activeRatio && setBackgroundColor(activeRatio, e.target.value)}
              className={`w-8 h-8 rounded border border-gray-300 ${activeRatio ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              disabled={!activeRatio}
            />
            <div
              className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center cursor-pointer text-xs"
              style={{
                background: (activeState?.backgroundColor ?? '#FFFFFF') === 'transparent'
                  ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 12px 12px'
                  : (activeState?.backgroundColor ?? '#FFFFFF'),
              }}
              title="Current color"
            />
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => activeRatio && setEyedropperActive(!eyedropperActive)}
              disabled={!activeRatio}
              className={`text-xs px-2 py-1 rounded border ${
                eyedropperActive
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              } ${!activeRatio ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              🔍 Eyedropper
            </button>
            <button
              onClick={() => activeRatio && setBackgroundColor(activeRatio, 'transparent')}
              disabled={!activeRatio}
              className={`text-xs px-2 py-1 rounded border ${
                activeState?.backgroundColor === 'transparent'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              } ${!activeRatio ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Transparent
            </button>
          </div>

          <label className={`flex items-center gap-2 text-sm text-gray-700 ${activeRatio ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
            <input
              type="checkbox"
              checked={activeState?.useShadow ?? false}
              onChange={() => activeRatio && toggleShadow(activeRatio)}
              disabled={!activeRatio}
              className="rounded border-gray-300"
            />
            Drop shadow
          </label>
        </div>

        {/* Generate button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          {error && <div className="flash-error text-xs mb-2">{error}</div>}
          <button
            onClick={handleGenerate}
            disabled={totalSelectedSizes === 0 || processing}
            className="btn-primary w-full py-2.5"
          >
            {processing ? 'Processing...' : totalSelectedSizes === 0 ? 'Select sizes to generate' : `Generate ${totalSelectedSizes} size${totalSelectedSizes !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Main crop area */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Top bar — image info, navigation, zoom */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0 space-y-1">
          {/* Row 1: Image info + sacrifice direction + warning */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700 truncate max-w-[200px]" title={originalFilename}>
                {originalFilename}
              </span>
              <span>{originalWidth}×{originalHeight}px</span>
              {sacrificeDir !== 'none' && (
                <span className="text-amber-600">
                  {sacrificeDir === 'horizontal' ? '← → Will sacrifice left/right' : '↑ ↓ Will sacrifice top/bottom'}
                </span>
              )}
              {sacrificeDir === 'none' && activeRatioData && (
                <span className="text-green-600">✓ Ratios match — no cropping needed</span>
              )}
            </div>
            {hasDisabledSizes && (
              <span className="text-amber-700 font-medium">
                ⚠ Some sizes below 150 DPI are disabled
              </span>
            )}
          </div>
          {/* Row 2: Navigation + zoom */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={activeIndexAll <= 0}
                className="btn-secondary btn-sm"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-600">
                {activeRatioData ? (
                  <>
                    {activeRatioData.name}
                    <span className="text-gray-400 ml-1">
                      ({activeIndexAll + 1}/{allRatioKeys.length})
                    </span>
                  </>
                ) : (
                  'Select a ratio to begin'
                )}
              </span>
              <button
                onClick={goNext}
                disabled={activeIndexAll >= allRatioKeys.length - 1}
                className="btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="btn-secondary btn-sm" title="Zoom out">−</button>
              <button onClick={zoomIn} className="btn-secondary btn-sm" title="Zoom in">+</button>
              <button onClick={resetCrop} className="btn-secondary btn-sm" title="Reset">Reset</button>
            </div>
          </div>
        </div>

        {/* Cropper canvas */}
        <div
          ref={cropperContainerRef}
          className={`flex-1 min-h-0 relative overflow-hidden ${eyedropperActive ? 'cursor-crosshair' : ''} ${activeState?.backgroundColor === 'transparent' ? 'crop-bg-transparent' : ''}`}
          style={{ '--crop-bg': activeState?.backgroundColor === 'transparent' ? undefined : (activeState?.backgroundColor || '#FFFFFF') }}
        >
          {eyedropperActive && (
            <>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                Click on the image to pick a color
              </div>
              {/* Transparent overlay to capture clicks above cropperjs */}
              <div
                className="absolute inset-0 z-10 cursor-crosshair"
                onClick={handleEyedropper}
              />
            </>
          )}

          {activeRatio ? (
            <Cropper
              ref={cropperRef}
              src={imageUrl}
              crossOrigin="anonymous"
              style={{ height: '100%', width: '100%' }}
              aspectRatio={activeRatioData?.ratio}
              viewMode={0}
              dragMode="move"
              cropBoxMovable={false}
              cropBoxResizable={false}
              zoomable={true}
              zoomOnWheel={false}
              zoomOnTouch={true}
              autoCropArea={0.85}
              responsive={true}
              restore={false}
              guides={false}
              center={false}
              highlight={false}
              background={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-lg">Select at least one ratio from the sidebar to begin cropping</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function getSacrificeDir(originalRatio, targetRatio) {
  if (Math.abs(originalRatio - targetRatio) < 0.01) return 'none';
  if (targetRatio > originalRatio) return 'horizontal';
  return 'vertical';
}

/**
 * Calculate effective DPI and return quality tier.
 * effectiveDPI = min(cropSourceWidth / targetWidthInches, cropSourceHeight / targetHeightInches)
 */
function getQualityBadge(cropSourceWidth, cropSourceHeight, targetWidthInches, targetHeightInches) {
  const dpiX = cropSourceWidth / targetWidthInches;
  const dpiY = cropSourceHeight / targetHeightInches;
  const effectiveDPI = Math.min(dpiX, dpiY);

  if (effectiveDPI >= 300) {
    return { label: 'Excellent', color: 'text-green-600 bg-green-50 border-green-200', dpi: Math.round(effectiveDPI), disabled: false };
  }
  if (effectiveDPI >= 200) {
    return { label: 'Good', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dpi: Math.round(effectiveDPI), disabled: false };
  }
  if (effectiveDPI >= 150) {
    return { label: 'Fair', color: 'text-orange-600 bg-orange-50 border-orange-200', dpi: Math.round(effectiveDPI), disabled: false };
  }
  return { label: 'Low quality', color: 'text-red-600 bg-red-50 border-red-200', dpi: Math.round(effectiveDPI), disabled: true };
}
