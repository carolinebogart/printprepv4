'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import ResolutionCalculatorModal from './ResolutionCalculatorModal';
import { getImageSpecs } from '@/lib/output-sizes';

export default function CropTool({
  imageId,
  imageUrl,
  originalFilename,
  originalWidth,
  originalHeight,
  originalRatio,
  orientation,
  portraitRatios,
  landscapeRatios,
}) {
  const router = useRouter();
  const cropperRef = useRef(null);
  const targetCropBoxRef = useRef(null);

  // Current orientation: can toggle between portrait and landscape
  const [currentOrientation, setCurrentOrientation] = useState(orientation);

  // Derive active ratio list based on current orientation
  const ratios = currentOrientation === 'landscape' ? landscapeRatios : portraitRatios;

  // Helper to initialize crop states for a ratio list
  const initCropStates = (ratioList) =>
    ratioList.reduce((acc, r) => {
      return {
        ...acc,
        [r.key]: {
          canvasData: null,
          cropBoxData: null,
          sizes: r.sizes.map((s) => ({
            ...s,
            useUpscaling: null,
            selected: false,
          })),
          upscaleMode: null, // null = use global masterView; 'native' | 'upscale' = per-ratio override
          backgroundColor: '#FFFFFF',
          useShadow: false,
        },
      };
    }, {});

  // Which ratios are selected — start with none selected
  const [selectedRatios, setSelectedRatios] = useState(() =>
    initCropStates(ratios)
  );

  // Current ratio being edited
  const [activeRatio, setActiveRatio] = useState(null);

  // Per-ratio crop state
  const [cropStates, setCropStates] = useState(() =>
    initCropStates(ratios)
  );

  // Custom size state: { width: number, height: number, unit: 'px' | 'in', confirmed: false }
  const [customSize, setCustomSize] = useState({ width: null, height: null, unit: 'px', confirmed: false });

  // Global view filter: 'native' shows sizes with useUpscaling=false, 'upscale' shows useUpscaling=true
  const [masterView, setMasterView] = useState('native');

  // Eyedropper
  const [eyedropperActive, setEyedropperActive] = useState(false);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null); // { imageId, expiresAt, count }
  const [activityLog, setActivityLog] = useState([]); // [{ text, done }]

  // Resolution calculator modal
  const [calcOpen, setCalcOpen] = useState(false);

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
          if (state.cropBoxData) {
            c.setCropBoxData(state.cropBoxData);
            targetCropBoxRef.current = { width: state.cropBoxData.width, height: state.cropBoxData.height };
          } else {
            computeAndSetCropBox(c, ratio.ratio);
          }
        } catch (err) {
          // Cropper not ready yet — ignore
        }
      }, 50);
    } else {
      // No saved state — compute and pin a fresh crop box for this ratio
      setTimeout(() => {
        const c = cropperRef.current?.cropper;
        if (!c) return;
        computeAndSetCropBox(c, ratio.ratio);
      }, 50);
    }
  }, [activeRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if all sizes in a ratio are below DPI threshold
  const isRatioFullyDisabled = (key) =>
    cropStates[key].sizes.every((size) =>
      getQualityBadge(originalWidth, originalHeight, size.width, size.height).disabled
    );

  // Toggle ratio selection — always switch focus to the toggled-on ratio
  const toggleRatio = (key) => {
    setSelectedRatios((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key]) {
        // Turning on — always switch focus to this ratio
        saveCropState();
        setActiveRatio(key);
      } else if (activeRatio === key) {
        // Turning off the active ratio — find closest viable selected ratio
        const keyIndex = allRatioKeys.indexOf(key);
        const remaining = ratios
          .filter((r) => next[r.key] && !isRatioFullyDisabled(r.key))
          .map((r) => r.key);
        if (remaining.length === 0) {
          setActiveRatio(null);
        } else {
          // Pick the closest selected ratio by index distance
          const closest = remaining.reduce((best, k) => {
            const dist = Math.abs(allRatioKeys.indexOf(k) - keyIndex);
            const bestDist = Math.abs(allRatioKeys.indexOf(best) - keyIndex);
            return dist < bestDist ? k : best;
          });
          saveCropState();
          setActiveRatio(closest);
        }
      }
      return next;
    });
  };

  // Toggle size selection within a ratio
  const toggleSize = (ratioKey, sizeIndex) => {
    const sizes = [...cropStates[ratioKey].sizes];
    sizes[sizeIndex] = { ...sizes[sizeIndex], selected: !sizes[sizeIndex].selected };
    setCropStates((prev) => ({ ...prev, [ratioKey]: { ...prev[ratioKey], sizes } }));
    // If no enabled sizes remain selected, deselect the ratio
    const anySelected = sizes.some((s) => {
      const badge = getQualityBadge(originalWidth, originalHeight, s.width, s.height);
      return s.selected && !badge.disabled;
    });
    if (!anySelected && selectedRatios[ratioKey]) {
      toggleRatio(ratioKey);
    }
  };

  // Toggle useUpscaling for a single size (does not affect selection)
  // Tri-state: null = follow view, true = locked AI, false = locked native
  // In native view: null→true, true→null
  // In upscale view: null→false, false→null
  const toggleSizeUpscaling = (ratioKey, sizeIndex) => {
    const effectiveMode = cropStates[ratioKey].upscaleMode ?? masterView;
    setCropStates((prev) => {
      const sizes = [...prev[ratioKey].sizes];
      const current = sizes[sizeIndex].useUpscaling;
      let next;
      if (effectiveMode === 'upscale') {
        next = current === false ? null : false;
      } else {
        next = current === true ? null : true;
      }
      sizes[sizeIndex] = { ...sizes[sizeIndex], useUpscaling: next };
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

  // Per-ratio view toggle: changes view mode and clears individual size locks for that ratio
  const handleRatioViewToggle = (ratioKey, mode) => {
    if (cropStates[ratioKey].upscaleMode === mode) return; // no-op if already active
    setCropStates((prev) => ({
      ...prev,
      [ratioKey]: {
        ...prev[ratioKey],
        upscaleMode: mode,
        sizes: prev[ratioKey].sizes.map((s) => ({ ...s, useUpscaling: null })),
      },
    }));
  };

  // Global view toggle: sets masterView, resets all per-ratio overrides, and clears individual size locks
  const handleMasterView = (mode) => {
    if (masterView === mode) return; // no-op if already active
    setMasterView(mode);
    setCropStates((prev) => {
      const next = {};
      for (const key of Object.keys(prev)) {
        next[key] = {
          ...prev[key],
          upscaleMode: null,
          sizes: prev[key].sizes.map((s) => ({ ...s, useUpscaling: null })),
        };
      }
      return next;
    });
  };

  // Select all non-disabled sizes in a ratio
  const selectAllInRatio = (ratioKey) => {
    setCropStates((prev) => ({
      ...prev,
      [ratioKey]: {
        ...prev[ratioKey],
        sizes: prev[ratioKey].sizes.map((s) => {
          const badge = getQualityBadge(originalWidth, originalHeight, s.width, s.height);
          return badge.disabled ? s : { ...s, selected: true };
        }),
      },
    }));
    setSelectedRatios((prev) => ({ ...prev, [ratioKey]: true }));
  };

  // Deselect all sizes in a ratio
  const selectNoneInRatio = (ratioKey) => {
    setCropStates((prev) => ({
      ...prev,
      [ratioKey]: {
        ...prev[ratioKey],
        sizes: prev[ratioKey].sizes.map((s) => ({ ...s, selected: false })),
      },
    }));
    setSelectedRatios((prev) => ({ ...prev, [ratioKey]: false }));
  };

  // Select all non-disabled sizes across all ratios
  const selectAllGlobal = () => {
    setCropStates((prev) => {
      const next = {};
      for (const key of Object.keys(prev)) {
        next[key] = {
          ...prev[key],
          sizes: prev[key].sizes.map((s) => {
            const badge = getQualityBadge(originalWidth, originalHeight, s.width, s.height);
            return badge.disabled ? s : { ...s, selected: true };
          }),
        };
      }
      return next;
    });
    setSelectedRatios(
      ratios.reduce((acc, r) => {
        const hasSelectable = r.sizes.some(
          (s) => !getQualityBadge(originalWidth, originalHeight, s.width, s.height).disabled
        );
        return { ...acc, [r.key]: hasSelectable };
      }, {})
    );
  };

  // Select (or deselect if already all selected) the largest non-disabled size in each ratio
  const selectLargestGlobal = () => {
    // Find the largest non-disabled size index for each ratio
    const largestIdxByKey = {};
    for (const r of ratios) {
      let idx = -1;
      for (let i = r.sizes.length - 1; i >= 0; i--) {
        if (!getQualityBadge(originalWidth, originalHeight, r.sizes[i].width, r.sizes[i].height).disabled) {
          idx = i;
          break;
        }
      }
      largestIdxByKey[r.key] = idx;
    }
    // Check if all largest sizes are already selected (to toggle off)
    const allLargestSelected = ratios.every((r) => {
      const idx = largestIdxByKey[r.key];
      return idx === -1 || cropStates[r.key].sizes[idx].selected;
    });
    const newSelected = !allLargestSelected;
    setCropStates((prev) => {
      const next = {};
      for (const r of ratios) {
        const idx = largestIdxByKey[r.key];
        next[r.key] = {
          ...prev[r.key],
          sizes: prev[r.key].sizes.map((s, i) => ({ ...s, selected: i === idx ? newSelected : s.selected })),
        };
      }
      return next;
    });
    setSelectedRatios(
      ratios.reduce((acc, r) => {
        const idx = largestIdxByKey[r.key];
        const willHaveSelection = newSelected && idx !== -1;
        // Keep existing ratio selection or set based on whether largest is now selected
        const anyOtherSelected = idx === -1
          ? false
          : cropStates[r.key].sizes.some((s, i) => i !== idx && s.selected);
        return { ...acc, [r.key]: willHaveSelection || anyOtherSelected };
      }, {})
    );
  };

  // Deselect all sizes across all ratios
  const selectNoneGlobal = () => {
    setCropStates((prev) => {
      const next = {};
      for (const key of Object.keys(prev)) {
        next[key] = {
          ...prev[key],
          sizes: prev[key].sizes.map((s) => ({ ...s, selected: false })),
        };
      }
      return next;
    });
    setSelectedRatios(ratios.reduce((acc, r) => ({ ...acc, [r.key]: false }), {}));
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
    for (let i = activeIndexAll + 1; i < allRatioKeys.length; i++) {
      const nextKey = allRatioKeys[i];
      if (isRatioFullyDisabled(nextKey)) continue;
      saveCropState();
      if (!selectedRatios[nextKey]) {
        setSelectedRatios((prev) => ({ ...prev, [nextKey]: true }));
      }
      setActiveRatio(nextKey);
      return;
    }
  };

  const goPrev = () => {
    for (let i = activeIndexAll - 1; i >= 0; i--) {
      const prevKey = allRatioKeys[i];
      if (isRatioFullyDisabled(prevKey)) continue;
      saveCropState();
      if (!selectedRatios[prevKey]) {
        setSelectedRatios((prev) => ({ ...prev, [prevKey]: true }));
      }
      setActiveRatio(prevKey);
      return;
    }
  };



  // Re-pin crop box to fixed size after any zoom so it never shrinks
  const rePinCropBox = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || !targetCropBoxRef.current) return;
    const containerData = cropper.getContainerData();
    const { width: boxW, height: boxH } = targetCropBoxRef.current;
    cropper.setCropBoxData({
      left: (containerData.width - boxW) / 2,
      top: (containerData.height - boxH) / 2,
      width: boxW,
      height: boxH,
    });
  }, []);

  // Compute the 85%-fit crop box size for a given ratio, store it as the target, and apply it
  const computeAndSetCropBox = useCallback((cropper, ratioVal) => {
    const containerData = cropper.getContainerData();
    let boxW, boxH;
    if (ratioVal >= 1) {
      boxH = containerData.height * 0.85;
      boxW = boxH * ratioVal;
      if (boxW > containerData.width * 0.85) {
        boxW = containerData.width * 0.85;
        boxH = boxW / ratioVal;
      }
    } else {
      boxW = containerData.width * 0.85;
      boxH = boxW / ratioVal;
      if (boxH > containerData.height * 0.85) {
        boxH = containerData.height * 0.85;
        boxW = boxH * ratioVal;
      }
    }
    targetCropBoxRef.current = { width: boxW, height: boxH };
    cropper.setCropBoxData({
      left: (containerData.width - boxW) / 2,
      top: (containerData.height - boxH) / 2,
      width: boxW,
      height: boxH,
    });
  }, []);

  // Zoom controls — always zoom from center of crop box so image stays centered
  const zoomIn = () => { cropperRef.current?.cropper?.zoom(0.1); rePinCropBox(); };
  const zoomOut = () => { cropperRef.current?.cropper?.zoom(-0.1); rePinCropBox(); };
  const resetCrop = () => cropperRef.current?.cropper?.reset();

  // Intercept mouse wheel to zoom from center instead of cursor position
  const cropperContainerRef = useRef(null);
  const handleCropperWheel = useCallback((e) => {
    e.preventDefault();
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    cropper.zoom(delta);
    rePinCropBox();
  }, [rePinCropBox]);

  // Attach wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = cropperContainerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleCropperWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleCropperWheel);
  }, [handleCropperWheel]);

  // Toggle between portrait and landscape orientation
  const handleOrientationToggle = useCallback(() => {
    saveCropState();
    const newOrientation = currentOrientation === 'landscape' ? 'portrait' : 'landscape';
    const newRatios = newOrientation === 'landscape' ? landscapeRatios : portraitRatios;

    // Reset all selections and crop states for the new orientation
    setCurrentOrientation(newOrientation);
    // Reset selectedRatios to match new ratios structure
    setSelectedRatios(newRatios.reduce((acc, r) => ({ ...acc, [r.key]: false }), {}));
    setActiveRatio(null);
    setCropStates(initCropStates(newRatios));
  }, [currentOrientation, portraitRatios, landscapeRatios, saveCropState, initCropStates]);

  // Handle custom size confirmation
  const handleConfirmCustomSize = useCallback(() => {
    if (!customSize.width || !customSize.height) {
      alert('Please enter both width and height');
      return;
    }

    const w = parseFloat(customSize.width);
    const h = parseFloat(customSize.height);
    if (!w || !h || w <= 0 || h <= 0) {
      alert('Width and height must be positive numbers');
      return;
    }

    // Validate max dimensions
    const maxPx = 18000;
    const maxIn = 60;
    if (customSize.unit === 'px') {
      if (w > maxPx || h > maxPx) {
        alert(`Maximum pixel dimension is ${maxPx}px`);
        return;
      }
    } else {
      if (w > maxIn || h > maxIn) {
        alert(`Maximum inch dimension is ${maxIn}in`);
        return;
      }
    }

    // Convert to inches
    const widthIn = customSize.unit === 'px' ? w / 300 : w;
    const heightIn = customSize.unit === 'px' ? h / 300 : h;
    const ratio = w / h;

    // Create/update custom ratio entry
    const label = `${customSize.width}×${customSize.height} ${customSize.unit}`;
    const newRatios = [
      {
        key: 'custom',
        name: 'Custom Size',
        ratio,
        isCustom: true,
        sizes: [{ width: widthIn, height: heightIn, label }],
      },
      ...ratios,
    ];

    // Add custom to crop states
    setCropStates((prev) => ({
      custom: {
        canvasData: null,
        cropBoxData: null,
        sizes: [{ width: widthIn, height: heightIn, label, useUpscaling: null, selected: false }],
        upscaleMode: null,
        backgroundColor: '#FFFFFF',
        useShadow: false,
      },
      ...prev,
    }));

    // Add to selected ratios (but don't auto-activate)
    setSelectedRatios((prev) => ({ ...prev, custom: false }));

    // Mark as confirmed so we don't re-render the input form
    setCustomSize((prev) => ({ ...prev, confirmed: true }));
  }, [customSize, ratios]);

  // Handle custom size change
  const handleCustomSizeChange = useCallback((field, value) => {
    setCustomSize((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Reset custom size
  const handleResetCustomSize = useCallback(() => {
    setCustomSize({ width: null, height: null, unit: 'px', confirmed: false });
    setCropStates((prev) => {
      const newStates = { ...prev };
      delete newStates.custom;
      return newStates;
    });
    setSelectedRatios((prev) => {
      const newSelected = { ...prev };
      delete newSelected.custom;
      return newSelected;
    });
    if (activeRatio === 'custom') {
      setActiveRatio(null);
    }
  }, [activeRatio]);

  // Generate all outputs
  const handleGenerate = async () => {
    saveCropState();
    setProcessing(true);
    setError(null);
    setSuccessData(null);
    setActivityLog([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

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
          ...(s.useUpscaling ? { useUpscaling: true } : {}),
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

    // Kick off timed activity log simulation
    const totalFiles = allCropData.reduce((n, c) => n + c.sizes.length, 0);
    const timers = [];

    // Phase 1: Preparing image
    setActivityLog([{ text: 'Preparing image...', done: false }]);

    // Phase 2: Generating outputs (1.5s)
    timers.push(setTimeout(() => {
      setActivityLog([
        { text: 'Preparing image...', done: true },
        { text: 'Generating outputs...', done: false },
      ]);
    }, 1500));

    // Phase 3: Tick file counter every 1.5s starting at 2s
    let filesDone = 0;
    timers.push(setTimeout(() => {
      const tick = setInterval(() => {
        filesDone = Math.min(filesDone + 1, totalFiles - 1);
        setActivityLog([
          { text: 'Preparing image...', done: true },
          { text: 'Generating outputs...', done: true },
          { text: `${filesDone} of ${totalFiles} files done...`, done: false },
        ]);
      }, 1500);
      timers.push(tick);
    }, 2000));

    const clearTimers = () => timers.forEach((t) => clearTimeout(t));

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, cropConfigs: allCropData }),
      });

      const data = await res.json();
      clearTimers();

      if (!res.ok) {
        setError(data.error || 'Processing failed.');
        setProcessing(false);
        setActivityLog([]);
        return;
      }

      // Signal the header credits badge to refresh
      window.dispatchEvent(new Event('credits-updated'));
      setSuccessData({
        imageId,
        expiresAt: data.expiresAt,
        count: data.successfulOutputs,
        warnings: data.warnings || [],
      });
      setProcessing(false);
    } catch {
      clearTimers();
      setError('Processing failed. Please try again.');
      setProcessing(false);
      setActivityLog([]);
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

  const hasAIUpscaleSizes = selectedRatioKeys.some((key) =>
    cropStates[key].sizes.some((size) => {
      const badge = getQualityBadge(originalWidth, originalHeight, size.width, size.height);
      return size.selected && !badge.disabled && size.useUpscaling === true;
    })
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
      {/* Left sidebar — ratio selection */}
      <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Select Ratios</h2>
          <div className="flex gap-1">
            <button
              onClick={() => handleOrientationToggle()}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              title="Toggle between portrait and landscape orientation"
            >
              {currentOrientation === 'portrait' ? '↔' : '↕'} {currentOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
          </div>
        </div>

        {/* Custom Size Form — at the top */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-700 mb-1.5">Custom Size</div>
          <div className="space-y-1.5">
            <div className="flex gap-1">
              <input
                type="number"
                placeholder="Width"
                value={customSize.width || ''}
                onChange={(e) => handleCustomSizeChange('width', e.target.value)}
                disabled={customSize.confirmed}
                className="w-16 text-xs px-2 py-1 rounded border border-gray-300 disabled:bg-gray-50"
              />
              <span className="text-xs text-gray-500 py-1">×</span>
              <input
                type="number"
                placeholder="Height"
                value={customSize.height || ''}
                onChange={(e) => handleCustomSizeChange('height', e.target.value)}
                disabled={customSize.confirmed}
                className="w-16 text-xs px-2 py-1 rounded border border-gray-300 disabled:bg-gray-50"
              />
              <div className="flex gap-0.5 ml-auto">
                {['px', 'in'].map((u) => (
                  <button
                    key={u}
                    onClick={() => handleCustomSizeChange('unit', u)}
                    disabled={customSize.confirmed}
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                      customSize.unit === u
                        ? 'border-gray-400 text-gray-700 bg-gray-100'
                        : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
                    } disabled:opacity-50`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            {customSize.confirmed ? (
              <button
                onClick={handleResetCustomSize}
                className="w-full text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 bg-green-50 border-green-300 text-green-700"
              >
                ✓ Custom size set — Edit
              </button>
            ) : (
              <button
                onClick={handleConfirmCustomSize}
                disabled={!customSize.width || !customSize.height}
                className="w-full text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set Custom Size
              </button>
            )}
          </div>
        </div>

        {/* Global view filter */}
        <div className="flex gap-1.5 mb-2">
          {['native', 'upscale'].map((mode) => {
            const isActive = masterView === mode;
            return (
              <button
                key={mode}
                onClick={() => handleMasterView(mode)}
                className={`flex-1 text-xs py-1 px-2 rounded border font-medium ${
                  isActive
                    ? mode === 'native'
                      ? 'border-gray-400 text-gray-700 bg-gray-100'
                      : 'border-blue-400 text-blue-700 bg-blue-100'
                    : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
                }`}
              >
                {mode === 'native' ? 'Native' : '+ Upscale'}
              </button>
            );
          })}
        </div>
        {/* Global select all / none / largest */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <button
            onClick={selectAllGlobal}
            className="flex-1 text-xs py-1 px-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Select all
          </button>
          <button
            onClick={selectNoneGlobal}
            className="flex-1 text-xs py-1 px-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Select none
          </button>
          <button
            onClick={selectLargestGlobal}
            className="w-full text-xs py-1 px-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Select largest
          </button>
        </div>

        {/* Build the full ratio list including custom if confirmed */}
        {(() => {
          const ratiosWithCustom = customSize.confirmed && cropStates.custom
            ? [{ key: 'custom', name: 'Custom Size', ratio: (cropStates.custom.sizes[0]?.width || 1) / (cropStates.custom.sizes[0]?.height || 1), isCustom: true }, ...ratios]
            : ratios;
          return ratiosWithCustom.map((r) => {
            const allSizesDisabled = cropStates[r.key].sizes.every((size) =>
              getQualityBadge(originalWidth, originalHeight, size.width, size.height).disabled
            );
          return (
          <div key={r.key} className="mb-3">
            <div
              className={`flex items-center gap-2 rounded px-2 py-1 -mx-1 ${allSizesDisabled ? 'opacity-60 cursor-not-allowed' : activeRatio === r.key ? 'bg-blue-100 border-2 border-blue-400 cursor-pointer' : 'cursor-pointer hover:bg-gray-50'}`}
              onClick={() => {
                if (allSizesDisabled) return;
                toggleRatio(r.key);
              }}
            >
              <input
                type="checkbox"
                checked={selectedRatios[r.key] && !allSizesDisabled}
                onChange={() => {}}
                disabled={allSizesDisabled}
                className="rounded border-gray-300 pointer-events-none"
                tabIndex={-1}
              />
              <span
                className={`text-sm font-medium ${
                  allSizesDisabled ? 'text-gray-400' : activeRatio === r.key ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {r.name}
              </span>
            </div>

            {/* Size checkboxes — always visible so user sees all options */}
            {
              <div className="ml-6 mt-1 space-y-1">
                {/* Per-ratio view toggle + select all/none */}
                {cropStates[r.key].sizes.some((s) => !getQualityBadge(originalWidth, originalHeight, s.width, s.height).disabled) && (
                  <div className="flex gap-1 mb-1 flex-wrap">
                    {['native', 'upscale'].map((mode) => {
                      const effectiveMode = cropStates[r.key].upscaleMode ?? masterView;
                      const isActive = effectiveMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={(e) => { e.stopPropagation(); handleRatioViewToggle(r.key, mode); }}
                          className={`text-[10px] py-0.5 px-2 rounded border font-medium ${
                            isActive
                              ? mode === 'native'
                                ? 'border-gray-400 text-gray-700 bg-gray-100'
                                : 'border-blue-400 text-blue-700 bg-blue-100'
                              : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
                          }`}
                        >
                          {mode === 'native' ? 'Native' : '+ Upscale'}
                        </button>
                      );
                    })}
                    <button
                      onClick={(e) => { e.stopPropagation(); selectAllInRatio(r.key); }}
                      className="text-[10px] py-0.5 px-2 rounded border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 font-medium"
                    >
                      All
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); selectNoneInRatio(r.key); }}
                      className="text-[10px] py-0.5 px-2 rounded border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 font-medium"
                    >
                      None
                    </button>
                  </div>
                )}
                {cropStates[r.key].sizes
                  .map((size, i) => ({ size, i }))
                  .filter(({ size }) => {
                    const badge = getQualityBadge(originalWidth, originalHeight, size.width, size.height);
                    return !badge.disabled; // always show all non-disabled sizes regardless of view
                  })
                  .map(({ size, i }) => {
                    const badge = getQualityBadge(originalWidth, originalHeight, size.width, size.height);
                    const effectiveMode = cropStates[r.key].upscaleMode ?? masterView;
                    // Display upscaled DPI if: locked to AI (true), or following upscale view (null + upscale mode)
                    // NOT if locked to native (false) even when view is upscale
                    const showUpscaled = size.useUpscaling === true || (size.useUpscaling === null && effectiveMode === 'upscale');
                    const upscaledDpi = badge.estimatedDpi ?? Math.min(badge.dpi * 4, 300);
                    let effectiveDpiLabel, effectiveBadgeColor;
                    if (showUpscaled) {
                      effectiveDpiLabel = `~${upscaledDpi} DPI · AI ✦`;
                      effectiveBadgeColor = size.useUpscaling === true
                        ? 'text-blue-700 bg-blue-100 border-blue-400' // locked to AI
                        : 'text-blue-600 bg-blue-50 border-blue-200'; // following view (preview)
                    } else if (badge.requiresUpscaling) {
                      // Native DPI is below usable threshold — show honestly, not as "AI Upscale"
                      effectiveDpiLabel = `${badge.dpi} DPI · Low`;
                      effectiveBadgeColor = 'text-red-600 bg-red-50 border-red-200';
                    } else {
                      effectiveDpiLabel = `${badge.dpi} DPI · ${badge.label}`;
                      effectiveBadgeColor = badge.color;
                    }
                    return (
                      <div
                        key={size.label}
                        className="flex items-center gap-1.5 rounded px-1 -mx-1 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          if (!selectedRatios[r.key]) {
                            toggleRatio(r.key);
                          } else if (activeRatio !== r.key) {
                            switchToRatio(r.key);
                          }
                          toggleSize(r.key, i);
                        }}
                      >
                        <span className="flex items-center gap-1.5 text-xs text-gray-600 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={!!size.selected}
                            onChange={() => {}}
                            className="rounded border-gray-300 pointer-events-none"
                            tabIndex={-1}
                          />
                          {size.label}&quot;
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${effectiveBadgeColor}`}>
                          {effectiveDpiLabel}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSizeUpscaling(r.key, i); }}
                          className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${
                            size.useUpscaling === true
                              ? 'text-blue-700 bg-blue-100 border-blue-400 hover:bg-blue-200'
                              : size.useUpscaling === false
                              ? 'text-gray-500 bg-gray-100 border-gray-400 hover:bg-gray-200'
                              : 'text-gray-300 bg-white border-gray-200 hover:text-gray-500 hover:border-gray-300'
                          }`}
                          title={
                            size.useUpscaling === true ? 'Locked to AI upscale — click to unset' :
                            size.useUpscaling === false ? 'Locked to native — click to unset' :
                            effectiveMode === 'upscale' ? 'Click to lock this size to native' : 'Click to lock this size to AI upscale'
                          }
                        >
                          ✦
                        </button>
                      </div>
                    );
                  })}
              </div>
            }
          </div>
        );
          });
        })()}

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
          {successData ? (
            <button
              onClick={() => router.push(`/history?new=${successData.imageId}`)}
              className="btn-primary w-full py-2.5"
            >
              View &amp; Download
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={totalSelectedSizes === 0 || processing}
              className="btn-primary w-full py-2.5"
            >
              {processing ? 'Processing...' : totalSelectedSizes === 0 ? 'Select sizes to generate' : `Generate ${totalSelectedSizes} size${totalSelectedSizes !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {/* Main crop area */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Top bar — image info, navigation, zoom */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0 space-y-1">
          {/* Filename row */}
          <div className="text-xs font-medium text-gray-700 break-all">
            {originalFilename}
          </div>
          {/* Row 1: Dimensions + specs + sacrifice direction + warnings */}
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[11px]">
            {(() => {
              const specs = getImageSpecs(originalWidth, originalHeight);
              return (
                <>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-slate-100 text-slate-600">{originalWidth}×{originalHeight}px</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-violet-100 text-violet-700">Ratio {specs.ratioStr}</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-sky-100 text-sky-700">{specs.wIn} x {specs.hIn} in.</span>
                  <span className="rounded px-1.5 py-0.5 font-medium bg-teal-100 text-teal-700">{specs.wCm} x {specs.hCm} cm</span>
                </>
              );
            })()}
            {sacrificeDir !== 'none' && (
              <span className="text-amber-600">
                {sacrificeDir === 'horizontal' ? '← → Will sacrifice left/right' : '↑ ↓ Will sacrifice top/bottom'}
              </span>
            )}
            {sacrificeDir === 'none' && activeRatioData && (
              <span className="text-green-600">✓ Ratios match — no cropping needed</span>
            )}
            {hasDisabledSizes && (
              <span className="text-red-600 font-medium">
                ⚠ Some sizes are very low resolution — output quality will be poor
              </span>
            )}
            {hasAIUpscaleSizes && (
              <span className="text-blue-700 font-medium">
                ✦ AI upscaling selected for some sizes
              </span>
            )}
          </div>
          {/* Row 2: Navigation + zoom */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!allRatioKeys.slice(0, activeIndexAll).some((k) => !isRatioFullyDisabled(k))}
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
                disabled={!allRatioKeys.slice(activeIndexAll + 1).some((k) => !isRatioFullyDisabled(k))}
                className="btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="btn-secondary btn-sm" title="Zoom out">−</button>
              <button onClick={zoomIn} className="btn-secondary btn-sm" title="Zoom in">+</button>
              <button onClick={resetCrop} className="btn-secondary btn-sm" title="Reset">Reset</button>
              <button onClick={() => setCalcOpen(true)} className="btn-secondary btn-sm" title="Resolution calculator">
                Calculator
              </button>
            </div>
          </div>
        </div>

        {/* Processing / Success Banner */}
        {(processing || successData) && (
          <div className={`border-b px-6 py-4 flex-shrink-0 ${successData ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
            {successData ? (
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800">
                    {successData.count} file{successData.count !== 1 ? 's' : ''} ready to download
                  </p>
                  {successData.expiresAt && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      Download by{' '}
                      <strong>
                        {new Date(successData.expiresAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </strong>{' '}
                      — files are deleted after that.
                    </p>
                  )}
                  {successData.warnings?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {successData.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">{w}</p>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/history?new=${successData.imageId}`)}
                  className="btn-primary py-2 px-4 whitespace-nowrap"
                >
                  View &amp; Download
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="animate-spin h-4 w-4 text-gray-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Processing your image...</span>
                </div>
                <div className="space-y-0.5 font-mono text-xs text-gray-500">
                  {activityLog.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {entry.done ? (
                        <span className="text-green-600">&#10003;</span>
                      ) : (
                        <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                      )}
                      <span className={entry.done ? 'text-gray-400' : 'text-gray-600'}>{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
              ready={() => {
                const cropper = cropperRef.current?.cropper;
                if (!cropper) return;
                computeAndSetCropBox(cropper, activeRatioData?.ratio || 1);
              }}
              zoom={() => {
                // After any zoom (including pinch), re-pin crop box
                requestAnimationFrame(rePinCropBox);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-lg">Select at least one ratio from the sidebar to begin cropping</p>
            </div>
          )}
        </div>
      </div>
      </div>
      <ResolutionCalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />
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
  if (effectiveDPI >= 35) {
    const estimatedDpi = Math.min(Math.round(effectiveDPI * 4), 300);
    return { label: 'AI Upscale', color: 'text-blue-700 bg-blue-50 border-blue-200', dpi: Math.round(effectiveDPI), estimatedDpi, disabled: false, requiresUpscaling: true };
  }
  return { label: 'Low quality', color: 'text-red-600 bg-red-50 border-red-200', dpi: Math.round(effectiveDPI), disabled: false };
}
