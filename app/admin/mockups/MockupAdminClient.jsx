'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function MockupAdminClient({ scenes: initialScenes, frames: initialFrames }) {
  const [tab, setTab] = useState('scenes');
  const [scenes, setScenes] = useState(initialScenes);
  const [frames, setFrames] = useState(initialFrames);

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['scenes', 'frames'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'scenes' && (
        <ScenesTab scenes={scenes} setScenes={setScenes} />
      )}
      {tab === 'frames' && (
        <FramesTab frames={frames} setFrames={setFrames} />
      )}
    </div>
  );
}

// ── Scenes Tab ────────────────────────────────────────────────────────────────

const CANVAS_MAX_W = 700;

function ScenesTab({ scenes, setScenes }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Canvas / annotation state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null); // { w, h }
  const [mode, setMode] = useState(null); // 'frame_area' | 'placement' | 'reference_px'
  const [annotations, setAnnotations] = useState({ frameRect: null, placementPoint: null, referenceLine: null });
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  // Controlled field values
  const [frameAreaW, setFrameAreaW] = useState('');
  const [frameAreaH, setFrameAreaH] = useState('');
  const [placementX, setPlacementX] = useState('');
  const [placementY, setPlacementY] = useState('');
  const [refPx, setRefPx] = useState('');

  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // Scale ratio: natural image px per display px
  const scaleRatio = useCallback(() => {
    if (!canvasRef.current || !naturalSize) return 1;
    return naturalSize.w / canvasRef.current.offsetWidth;
  }, [naturalSize]);

  // Redraw canvas whenever image or annotations change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewUrl) return;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!img || !img.complete) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const ratio = scaleRatio();

    // Draw live drag preview
    if (dragStart && dragCurrent) {
      if (mode === 'frame_area') {
        const x = Math.min(dragStart.x, dragCurrent.x);
        const y = Math.min(dragStart.y, dragCurrent.y);
        const w = Math.abs(dragCurrent.x - dragStart.x);
        const h = Math.abs(dragCurrent.y - dragStart.y);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(34,197,94,0.1)';
        ctx.fillRect(x, y, w, h);
        ctx.setLineDash([]);
      } else if (mode === 'reference_px') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(dragCurrent.x, dragStart.y);
        ctx.stroke();
        // End ticks
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y - 8);
        ctx.lineTo(dragStart.x, dragStart.y + 8);
        ctx.moveTo(dragCurrent.x, dragStart.y - 8);
        ctx.lineTo(dragCurrent.x, dragStart.y + 8);
        ctx.stroke();
        const px = Math.round(Math.abs(dragCurrent.x - dragStart.x) * ratio);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`${px}px`, (dragStart.x + dragCurrent.x) / 2 - 20, dragStart.y - 12);
      }
    }

    // Draw committed annotations
    const { frameRect, placementPoint, referenceLine } = annotations;

    if (frameRect) {
      const { x, y, w, h } = frameRect;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(x / ratio, y / ratio, w / ratio, h / ratio);
      ctx.fillStyle = 'rgba(34,197,94,0.1)';
      ctx.fillRect(x / ratio, y / ratio, w / ratio, h / ratio);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${w}×${h}px`, x / ratio + 4, y / ratio + 14);
    }

    if (placementPoint) {
      const { x, y } = placementPoint;
      const dx = x / ratio;
      const dy = y / ratio;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx - 12, dy);
      ctx.lineTo(dx + 12, dy);
      ctx.moveTo(dx, dy - 12);
      ctx.lineTo(dx, dy + 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`(${x}, ${y})`, dx + 8, dy - 8);
    }

    if (referenceLine) {
      const { x1, x2, y } = referenceLine;
      const dy = y / ratio;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1 / ratio, dy);
      ctx.lineTo(x2 / ratio, dy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1 / ratio, dy - 8);
      ctx.lineTo(x1 / ratio, dy + 8);
      ctx.moveTo(x2 / ratio, dy - 8);
      ctx.lineTo(x2 / ratio, dy + 8);
      ctx.stroke();
      const px = Math.abs(x2 - x1);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${px}px`, (x1 / ratio + x2 / ratio) / 2 - 20, dy - 12);
    }
  }, [previewUrl, annotations, dragStart, dragCurrent, mode, scaleRatio]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) { setPreviewUrl(null); setNaturalSize(null); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleImgLoad() {
    const img = imgRef.current;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }

  function getCanvasPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleCanvasMouseDown(e) {
    if (!mode) return;
    const pos = getCanvasPos(e);
    if (mode === 'placement') {
      // Single click — commit immediately
      const ratio = scaleRatio();
      const nx = Math.round(pos.x * ratio);
      const ny = Math.round(pos.y * ratio);
      setAnnotations((a) => ({ ...a, placementPoint: { x: nx, y: ny } }));
      setPlacementX(String(nx));
      setPlacementY(String(ny));
      setMode(null);
      return;
    }
    setDragStart(pos);
    setDragCurrent(pos);
  }

  function handleCanvasMouseMove(e) {
    if (!dragStart) return;
    setDragCurrent(getCanvasPos(e));
  }

  function handleCanvasMouseUp(e) {
    if (!dragStart || !dragCurrent) return;
    const ratio = scaleRatio();

    if (mode === 'frame_area') {
      const x = Math.round(Math.min(dragStart.x, dragCurrent.x) * ratio);
      const y = Math.round(Math.min(dragStart.y, dragCurrent.y) * ratio);
      const w = Math.round(Math.abs(dragCurrent.x - dragStart.x) * ratio);
      const h = Math.round(Math.abs(dragCurrent.y - dragStart.y) * ratio);
      setAnnotations((a) => ({ ...a, frameRect: { x, y, w, h } }));
      setFrameAreaW(String(w));
      setFrameAreaH(String(h));
      setMode(null);
    } else if (mode === 'reference_px') {
      const x1 = Math.round(Math.min(dragStart.x, dragCurrent.x) * ratio);
      const x2 = Math.round(Math.max(dragStart.x, dragCurrent.x) * ratio);
      const y = Math.round(dragStart.y * ratio);
      setAnnotations((a) => ({ ...a, referenceLine: { x1, x2, y } }));
      setRefPx(String(Math.abs(x2 - x1)));
      setMode(null);
    }

    setDragStart(null);
    setDragCurrent(null);
  }

  function activateMode(m) {
    setMode((prev) => prev === m ? null : m);
    setDragStart(null);
    setDragCurrent(null);
  }

  function resetCanvas() {
    setPreviewUrl(null);
    setNaturalSize(null);
    setMode(null);
    setAnnotations({ frameRect: null, placementPoint: null, referenceLine: null });
    setDragStart(null);
    setDragCurrent(null);
    setFrameAreaW(''); setFrameAreaH('');
    setPlacementX(''); setPlacementY('');
    setRefPx('');
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError(null);
    setUploading(true);
    try {
      const form = e.target;
      const data = new FormData(form);
      const res = await fetch('/api/admin/mockups/scenes', { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setScenes((prev) => [json.scene, ...prev]);
      form.reset();
      resetCanvas();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(scene) {
    const res = await fetch(`/api/admin/mockups/scenes/${scene.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !scene.is_active }),
    });
    const json = await res.json();
    if (res.ok) setScenes((prev) => prev.map((s) => s.id === scene.id ? json.scene : s));
  }

  async function setDefault(scene) {
    const res = await fetch(`/api/admin/mockups/scenes/${scene.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    });
    const json = await res.json();
    if (res.ok) setScenes((prev) => prev.map((s) => ({
      ...s,
      is_default: s.id === scene.id ? true : false,
    })));
  }

  const cursorClass = mode ? 'cursor-crosshair' : 'cursor-default';

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Scene</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* File input */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Scene Image</label>
            <input type="file" name="file" accept="image/*" required className="w-full text-sm" onChange={handleFileChange} />
          </div>

          {/* Canvas preview + tools */}
          {previewUrl && (
            <div className="md:col-span-2 space-y-2">
              {/* Hidden img for natural dimensions */}
              <img ref={imgRef} src={previewUrl} onLoad={handleImgLoad} className="hidden" alt="" />

              {/* Tool buttons */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-gray-500 self-center font-medium">Annotation tools:</span>
                <ToolButton
                  active={mode === 'frame_area'}
                  color="green"
                  onClick={() => activateMode('frame_area')}
                  label={annotations.frameRect ? `Frame Area ✓ (${annotations.frameRect.w}×${annotations.frameRect.h})` : 'Set Frame Area'}
                  hint="Drag a rectangle"
                />
                <ToolButton
                  active={mode === 'placement'}
                  color="blue"
                  onClick={() => activateMode('placement')}
                  label={annotations.placementPoint ? `Placement ✓ (${annotations.placementPoint.x}, ${annotations.placementPoint.y})` : 'Set Placement Center'}
                  hint="Click a point"
                />
                <ToolButton
                  active={mode === 'reference_px'}
                  color="red"
                  onClick={() => activateMode('reference_px')}
                  label={annotations.referenceLine ? `Ref Width ✓ (${Math.abs(annotations.referenceLine.x2 - annotations.referenceLine.x1)}px)` : 'Set Reference Width'}
                  hint="Drag a line"
                />
              </div>
              {mode && (
                <p className="text-xs text-gray-500 italic">
                  {mode === 'frame_area' && 'Drag to draw the artwork bounding box (frame area).'}
                  {mode === 'placement' && 'Click the center point where artwork should be placed.'}
                  {mode === 'reference_px' && 'Drag horizontally across your reference object to measure its pixel width.'}
                </p>
              )}

              {/* Canvas */}
              <div className="relative border border-gray-200 rounded overflow-hidden" style={{ maxWidth: CANVAS_MAX_W }}>
                <canvas
                  ref={canvasRef}
                  className={`w-full block ${cursorClass}`}
                  style={{ aspectRatio: naturalSize ? `${naturalSize.w} / ${naturalSize.h}` : 'auto' }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              </div>
              {naturalSize && (
                <p className="text-xs text-gray-400">{naturalSize.w}×{naturalSize.h}px original</p>
              )}
            </div>
          )}

          {/* Text fields */}
          <Field label="Name" name="name" required />
          <Field label="Description" name="description" />

          {/* Controlled numeric fields */}
          <ControlledField
            label="Frame Area Width (px)"
            name="frame_area_width"
            value={frameAreaW}
            onChange={setFrameAreaW}
            required
            placeholder="e.g. 800 — or use Set Frame Area tool above"
          />
          <ControlledField
            label="Frame Area Height (px)"
            name="frame_area_height"
            value={frameAreaH}
            onChange={setFrameAreaH}
            required
            placeholder="e.g. 600 — or use Set Frame Area tool above"
          />
          <ControlledField
            label="Placement X (px)"
            name="placement_x"
            value={placementX}
            onChange={setPlacementX}
            required
            placeholder="Golden ratio center X — or use Set Placement tool above"
          />
          <ControlledField
            label="Placement Y (px)"
            name="placement_y"
            value={placementY}
            onChange={setPlacementY}
            required
            placeholder="Golden ratio center Y — or use Set Placement tool above"
          />

          {/* Semantic fields (uncontrolled) */}
          <Field label="Reference Object" name="reference_object_label" required placeholder='e.g. "sofa"' />
          <Field label="Reference Width (inches)" name="reference_object_inches" type="number" step="0.1" required placeholder="e.g. 82" />

          <ControlledField
            label="Reference Width (px in scene)"
            name="reference_object_px"
            value={refPx}
            onChange={setRefPx}
            required
            placeholder="e.g. 600 — or use Set Reference Width tool above"
          />

          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_default" value="true" id="scene_default" />
            <label htmlFor="scene_default" className="text-sm text-gray-700">Set as default scene</label>
          </div>

          {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-2">
            <button type="submit" disabled={uploading} className="btn-primary text-sm">
              {uploading ? 'Uploading…' : 'Upload Scene'}
            </button>
          </div>
        </form>
      </div>

      {/* Scene list */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scenes ({scenes.length})</h2>
        {scenes.length === 0 ? (
          <p className="text-sm text-gray-500">No scenes uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {scenes.map((scene) => (
              <div key={scene.id} className="flex items-center justify-between border border-gray-100 rounded p-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {scene.name}
                    {scene.is_default && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">default</span>}
                    {!scene.is_active && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">inactive</span>}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {scene.width}×{scene.height}px · ref: {scene.reference_object_label} ({scene.reference_object_inches}″ = {scene.reference_object_px}px)
                  </p>
                </div>
                <div className="flex gap-2">
                  {!scene.is_default && (
                    <button onClick={() => setDefault(scene)} className="text-xs text-purple-600 hover:underline">
                      Set default
                    </button>
                  )}
                  <button onClick={() => toggleActive(scene)} className="text-xs text-gray-500 hover:underline">
                    {scene.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Frames Tab ────────────────────────────────────────────────────────────────

function FramesTab({ frames, setFrames }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    setError(null);
    setUploading(true);
    try {
      const form = e.target;
      const data = new FormData(form);
      const res = await fetch('/api/admin/mockups/frames', { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setFrames((prev) => [json.frame, ...prev]);
      form.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(frame) {
    const res = await fetch(`/api/admin/mockups/frames/${frame.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !frame.is_active }),
    });
    const json = await res.json();
    if (res.ok) setFrames((prev) => prev.map((f) => f.id === frame.id ? json.frame : f));
  }

  async function setDefault(frame) {
    const res = await fetch(`/api/admin/mockups/frames/${frame.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    });
    const json = await res.json();
    if (res.ok) setFrames((prev) => prev.map((f) => ({
      ...f,
      is_default: f.id === frame.id ? true : false,
    })));
  }

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Frame</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a horizontal texture strip image. The leftmost {'{thickness}'}px will be used as corner tiles; the full strip tiles along each side.
        </p>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Frame Texture Strip</label>
            <input type="file" name="file" accept="image/*" required className="w-full text-sm" />
          </div>
          <Field label="Name" name="name" required placeholder='e.g. "Natural Wood"' />
          <Field label="Frame Thickness (px)" name="thickness_px" type="number" defaultValue="20" required />
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_default" value="true" id="frame_default" />
            <label htmlFor="frame_default" className="text-sm text-gray-700">Set as default frame</label>
          </div>
          {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-2">
            <button type="submit" disabled={uploading} className="btn-primary text-sm">
              {uploading ? 'Uploading…' : 'Upload Frame'}
            </button>
          </div>
        </form>
      </div>

      {/* Frame list */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Frames ({frames.length})</h2>
        {frames.length === 0 ? (
          <p className="text-sm text-gray-500">No frames uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {frames.map((frame) => (
              <div key={frame.id} className="flex items-center justify-between border border-gray-100 rounded p-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {frame.name}
                    {frame.is_default && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">default</span>}
                    {!frame.is_active && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">inactive</span>}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">thickness: {frame.thickness_px}px</p>
                </div>
                <div className="flex gap-2">
                  {!frame.is_default && (
                    <button onClick={() => setDefault(frame)} className="text-xs text-purple-600 hover:underline">
                      Set default
                    </button>
                  )}
                  <button onClick={() => toggleActive(frame)} className="text-xs text-gray-500 hover:underline">
                    {frame.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Field({ label, name, type = 'text', required, placeholder, step, defaultValue }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        step={step}
        defaultValue={defaultValue}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
    </div>
  );
}

function ControlledField({ label, name, value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
    </div>
  );
}

const toolColors = {
  green: {
    active: 'bg-green-600 text-white border-green-600',
    inactive: 'bg-white text-green-700 border-green-400 hover:bg-green-50',
    done: 'bg-green-50 text-green-800 border-green-400',
  },
  blue: {
    active: 'bg-blue-600 text-white border-blue-600',
    inactive: 'bg-white text-blue-700 border-blue-400 hover:bg-blue-50',
    done: 'bg-blue-50 text-blue-800 border-blue-400',
  },
  red: {
    active: 'bg-red-600 text-white border-red-600',
    inactive: 'bg-white text-red-700 border-red-400 hover:bg-red-50',
    done: 'bg-red-50 text-red-800 border-red-400',
  },
};

function ToolButton({ active, color, onClick, label, hint }) {
  const isDone = !active && label.includes('✓');
  const colors = toolColors[color];
  const cls = active ? colors.active : isDone ? colors.done : colors.inactive;
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}
