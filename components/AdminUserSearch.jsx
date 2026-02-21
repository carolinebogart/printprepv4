'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUserSearch({ initialSearch = '' }) {
  const [search, setSearch] = useState(initialSearch);
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    router.push(`/admin/users?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email..."
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />
      <button type="submit" className="btn-secondary text-sm">Search</button>
      {search && (
        <button
          type="button"
          onClick={() => { setSearch(''); router.push('/admin/users'); }}
          className="text-sm text-gray-500 hover:underline self-center"
        >
          Clear
        </button>
      )}
    </form>
  );
}
