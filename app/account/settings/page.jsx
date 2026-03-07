'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '../../../lib/supabase/client.js';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>
      <EmailSection />
      <PasswordSection />
      <MockupPrefsSection />
    </div>
  );
}

function EmailSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({
        type: 'success',
        text: 'Check your new email for a confirmation link.',
      });
      setEmail('');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Email</h2>
      {message && (
        <div className={`flash-${message.type} mb-4`}>{message.text}</div>
      )}
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          New Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="new@email.com"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-3"
        >
          {loading ? 'Updating...' : 'Update Email'}
        </button>
      </form>
    </div>
  );
}

function MockupPrefsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [frames, setFrames] = useState([]);
  const [prefs, setPrefs] = useState({
    auto_mockup: false,
    default_scene_id: '',
    default_frame_id: '',
    default_mat_color: '',
    default_mat_thickness_px: '',
  });

  useEffect(() => {
    fetch('/api/mockup/prefs')
      .then((r) => r.json())
      .then(({ prefs: p, scenes: s, frames: f }) => {
        setScenes(s || []);
        setFrames(f || []);
        if (p) {
          setPrefs({
            auto_mockup: p.auto_mockup ?? false,
            default_scene_id: p.default_scene_id ?? '',
            default_frame_id: p.default_frame_id ?? '',
            default_mat_color: p.default_mat_color ?? '',
            default_mat_thickness_px: p.default_mat_thickness_px ?? '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/mockup/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_mockup: prefs.auto_mockup,
          default_scene_id: prefs.default_scene_id || null,
          default_frame_id: prefs.default_frame_id || null,
          default_mat_color: prefs.default_mat_color || null,
          default_mat_thickness_px: prefs.default_mat_thickness_px ? parseInt(prefs.default_mat_thickness_px) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Mockup preferences saved.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Mockup Preferences</h2>
      <p className="text-sm text-gray-500 mb-4">
        Configure how mockups are generated for your processed images.
      </p>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && <div className={`flash-${message.type}`}>{message.text}</div>}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.auto_mockup}
              onChange={(e) => setPrefs((p) => ({ ...p, auto_mockup: e.target.checked }))}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              Auto-generate mockups after processing
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Scene</label>
            <select
              value={prefs.default_scene_id}
              onChange={(e) => setPrefs((p) => ({ ...p, default_scene_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">System default</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Frame</label>
            <select
              value={prefs.default_frame_id}
              onChange={(e) => setPrefs((p) => ({ ...p, default_frame_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">System default (wood)</option>
              <option value="none">No frame</option>
              {frames.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mat Color</label>
              <input
                type="text"
                value={prefs.default_mat_color}
                onChange={(e) => setPrefs((p) => ({ ...p, default_mat_color: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="#FFFFFF (leave blank for no mat)"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mat Thickness (px)</label>
              <input
                type="number"
                value={prefs.default_mat_thickness_px}
                onChange={(e) => setPrefs((p) => ({ ...p, default_mat_thickness_px: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. 40"
                min="0"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Mockup Preferences'}
          </button>
        </form>
      )}
    </div>
  );
}

function PasswordSection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Password</h2>
      {message && (
        <div className={`flash-${message.type} mb-4`}>{message.text}</div>
      )}
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="Min 8 characters"
          minLength={8}
          required
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Confirm password"
          minLength={8}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-3"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
