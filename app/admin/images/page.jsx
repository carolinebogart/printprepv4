import { createServiceClient } from '../../../lib/supabase/service.js';
import { requireAdmin } from '../../../lib/admin.js';
import AdminImageList from '../../../components/AdminImageList.jsx';

export const metadata = { title: 'Admin – Images | PrintPrep' };

export default async function AdminImagesPage({ searchParams }) {
  const { supabase } = await requireAdmin('read_only');

  const params = await searchParams;
  const search = params?.search || '';
  const dateFrom = params?.from || '';
  const dateTo = params?.to || '';
  const page = parseInt(params?.page || '1', 10);
  const perPage = 50;

  const service = createServiceClient();

  // Build query
  let query = service
    .from('images')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (dateFrom) {
    query = query.gte('created_at', new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setDate(to.getDate() + 1);
    query = query.lt('created_at', to.toISOString());
  }

  const { data: images, count } = await query;
  const totalPages = Math.ceil((count || 0) / perPage);

  // Get unique user IDs and fetch their emails
  const userIds = [...new Set((images || []).map((img) => img.user_id))];
  let userMap = {};
  if (userIds.length > 0) {
    // Fetch users in batches if needed
    const { data: usersData } = await service.auth.admin.listUsers({ perPage: 1000 });
    if (usersData?.users) {
      for (const u of usersData.users) {
        userMap[u.id] = u.email;
      }
    }
  }

  // If search is provided, filter by user email (post-fetch since images don't have email)
  let filteredImages = images || [];
  if (search) {
    const matchingUserIds = Object.entries(userMap)
      .filter(([, email]) => email.toLowerCase().includes(search.toLowerCase()))
      .map(([id]) => id);
    filteredImages = filteredImages.filter((img) => matchingUserIds.includes(img.user_id));
  }

  // Get output counts
  const imageIds = filteredImages.map((img) => img.id);
  let outputCounts = {};
  if (imageIds.length > 0) {
    const { data: outputs } = await service
      .from('processed_outputs')
      .select('image_id')
      .in('image_id', imageIds);
    if (outputs) {
      for (const o of outputs) {
        outputCounts[o.image_id] = (outputCounts[o.image_id] || 0) + 1;
      }
    }
  }

  // Check admin role for delete capability
  const { data: { user } } = await supabase.auth.getUser();
  const { data: adminData } = await service
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();
  const canDelete = adminData?.role === 'support_admin' || adminData?.role === 'super_admin';

  // Build URL params for pagination
  function buildUrl(p) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    params.set('page', String(p));
    return `/admin/images?${params.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Image Management</h1>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by user email..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
        />
        <div className="flex items-center gap-1">
          <label className="text-sm text-gray-500">From:</label>
          <input
            type="date"
            name="from"
            defaultValue={dateFrom}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-sm text-gray-500">To:</label>
          <input
            type="date"
            name="to"
            defaultValue={dateTo}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button type="submit" className="btn-primary text-sm">Filter</button>
      </form>

      <p className="text-sm text-gray-500 mb-4">
        {search ? `${filteredImages.length} results` : `${count || 0} total images`}
        {totalPages > 1 && !search && ` — Page ${page} of ${totalPages}`}
      </p>

      <AdminImageList
        images={filteredImages}
        userMap={userMap}
        outputCounts={outputCounts}
        canDelete={canDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && !search && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <a href={buildUrl(page - 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
              ← Previous
            </a>
          )}
          {page < totalPages && (
            <a href={buildUrl(page + 1)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
