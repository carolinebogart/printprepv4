'use client';

import { useState } from 'react';

export default function PortalButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
        setLoading(false);
      }
    } catch {
      alert('Network error');
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className="btn-primary disabled:opacity-50">
      {loading ? 'Loading...' : 'Manage Subscription'}
    </button>
  );
}
