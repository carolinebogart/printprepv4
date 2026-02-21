'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelDowngradeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm('Cancel the scheduled downgrade? You will keep your current plan.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/cancel-downgrade', { method: 'POST' });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel downgrade');
      }
    } catch {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
    >
      {loading ? 'Cancelling...' : 'Cancel downgrade'}
    </button>
  );
}
