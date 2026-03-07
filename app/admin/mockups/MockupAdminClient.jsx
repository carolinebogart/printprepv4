'use client';

import { useState } from 'react';

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

function ScenesTab({ scenes, setScenes }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Scene</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Scene Image</label>
            <input type="file" name="file" accept="image/*" required className="w-full text-sm" />
          </div>
          <Field label="Name" name="name" required />
          <Field label="Description" name="description" />
          <Field label="Frame Area Width (px)" name="frame_area_width" type="number" required placeholder="e.g. 800" />
          <Field label="Frame Area Height (px)" name="frame_area_height" type="number" required placeholder="e.g. 600" />
          <Field label="Placement X (px)" name="placement_x" type="number" required placeholder="Golden ratio center X" />
          <Field label="Placement Y (px)" name="placement_y" type="number" required placeholder="Golden ratio center Y" />
          <Field label="Reference Object" name="reference_object_label" required placeholder='e.g. "sofa"' />
          <Field label="Reference Width (inches)" name="reference_object_inches" type="number" step="0.1" required placeholder="e.g. 82" />
          <Field label="Reference Width (px in scene)" name="reference_object_px" type="number" required placeholder="e.g. 600" />
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

// ── Shared field component ────────────────────────────────────────────────────

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
