'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export default function CreditsBadge({ initialRemaining, initialTotal, initialActive }) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [total, setTotal] = useState(initialTotal);
  const [active, setActive] = useState(initialActive);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/credits', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRemaining(data.remaining);
        setTotal(data.total);
        setActive(data.active);
      }
    } catch {
      // Silently fail — keep showing last known values
    }
  }, []);

  // Re-fetch whenever the route changes (e.g. after processing → redirect)
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  // Also listen for a custom event so the process flow can trigger an immediate update
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('credits-updated', handler);
    return () => window.removeEventListener('credits-updated', handler);
  }, [refresh]);

  if (!active) return null;

  return (
    <span
      className={`credit-badge ${
        remaining <= 0 ? 'empty' : remaining < 10 ? 'low' : 'healthy'
      }`}
    >
      {remaining}/{total} credits
    </span>
  );
}
