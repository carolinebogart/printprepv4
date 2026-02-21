'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUserDetail({
  targetUser,
  subscription,
  stats,
  recentImages,
  notes,
  auditLogs,
  canEdit,
  adminRole,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left panel (2/3) */}
      <div className="lg:col-span-2 space-y-6">
        {canEdit && <ProfileForm user={targetUser} />}
        {canEdit && subscription && <CreditsForm userId={targetUser.id} subscription={subscription} />}

        {/* Subscription info */}
        {subscription && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Subscription</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Plan:</span> <span className="capitalize font-medium">{subscription.plan_name}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{subscription.status}</span></div>
              <div><span className="text-gray-500">Credits:</span> {Math.max(0, (subscription.credits_total || 0) - (subscription.credits_used || 0))} / {subscription.credits_total || 0}</div>
              <div><span className="text-gray-500">Period end:</span> {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}</div>
              <div className="col-span-2"><span className="text-gray-500">Stripe ID:</span> <code className="text-xs">{subscription.stripe_customer_id || '—'}</code></div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Statistics</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>Total images: <strong>{stats.totalImages}</strong></div>
            <div>Total outputs: <strong>{stats.totalOutputs}</strong></div>
          </div>
        </div>

        {/* Recent images */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Images</h2>
          {recentImages.length === 0 ? (
            <p className="text-sm text-gray-500">No images.</p>
          ) : (
            <div className="space-y-2">
              {recentImages.map((img) => (
                <div key={img.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="truncate max-w-[200px]">{img.original_filename}</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${img.status === 'processed' ? 'badge-success' : 'badge-warning'}`}>
                      {img.status}
                    </span>
                    <span className="text-gray-400 text-xs">{new Date(img.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit history for this user */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Admin Action History</h2>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No admin actions for this user.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {auditLogs.map((log) => (
                <div key={log.id} className="border-b border-gray-100 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.action_type}</span>
                    <span className="text-gray-400 text-xs">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.admin_note && <p className="text-gray-600 text-xs mt-1">{log.admin_note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel (1/3) — Notes */}
      <div className="space-y-6">
        {canEdit && <AddNoteForm userId={targetUser.id} />}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} canEdit={canEdit} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ user }) {
  const [email, setEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) { setMessage({ type: 'error', text: 'Admin note is required.' }); return; }
    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/admin/users/${user.id}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, admin_note: note }),
    });

    if (res.ok) {
      setMessage({ type: 'success', text: 'Profile updated.' });
      setNote('');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: 'error', text: data.message || 'Failed to update.' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Edit Profile</h2>
      {message && <div className={`flash-${message.type} mb-3`}>{message.text}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note (required)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary text-sm">
          {loading ? 'Saving...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}

function CreditsForm({ userId, subscription }) {
  const [credits, setCredits] = useState(Math.max(0, (subscription.credits_total || 0) - (subscription.credits_used || 0)));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) { setMessage({ type: 'error', text: 'Admin note is required.' }); return; }
    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_credits: parseInt(credits, 10), admin_note: note }),
    });

    if (res.ok) {
      setMessage({ type: 'success', text: 'Credits updated.' });
      setNote('');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: 'error', text: data.message || 'Failed to update.' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Adjust Credits</h2>
      <p className="text-sm text-gray-500 mb-3">
        Current: {Math.max(0, (subscription.credits_total || 0) - (subscription.credits_used || 0))} / {subscription.credits_total || 0}
      </p>
      {message && <div className={`flash-${message.type} mb-3`}>{message.text}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Balance</label>
          <input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note (required)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary text-sm">
          {loading ? 'Saving...' : 'Update Credits'}
        </button>
      </form>
    </div>
  );
}

function AddNoteForm({ userId }) {
  const [type, setType] = useState('general');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/admin/users/${userId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, is_pinned: pinned }),
    });

    if (res.ok) {
      setContent('');
      setPinned(false);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Add Note</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="general">General</option>
          <option value="support">Support</option>
          <option value="billing">Billing</option>
          <option value="warning">Warning</option>
          <option value="ban">Ban</option>
        </select>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Note content..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Pin this note
        </label>
        <button type="submit" disabled={loading} className="btn-primary text-sm w-full">
          {loading ? 'Adding...' : 'Add Note'}
        </button>
      </form>
    </div>
  );
}

function NoteCard({ note, canEdit }) {
  const router = useRouter();
  const typeColors = {
    general: 'bg-gray-50 border-gray-200',
    support: 'bg-blue-50 border-blue-200',
    billing: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    ban: 'bg-red-50 border-red-200',
  };

  const togglePin = async () => {
    await fetch(`/api/admin/notes/${note.id}/toggle-pin`, { method: 'POST' });
    router.refresh();
  };

  return (
    <div className={`rounded-lg border p-3 ${note.is_pinned ? 'bg-yellow-50 border-yellow-300' : typeColors[note.note_type] || typeColors.general}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium capitalize text-gray-600">{note.note_type}</span>
        <div className="flex items-center gap-2">
          {note.is_pinned && <span className="text-xs text-yellow-600">📌</span>}
          {canEdit && (
            <button onClick={togglePin} className="text-xs text-gray-400 hover:text-gray-600">
              {note.is_pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-800">{note.content}</p>
      <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleString()}</p>
    </div>
  );
}
