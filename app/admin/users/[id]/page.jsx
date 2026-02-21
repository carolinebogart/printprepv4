import { requireAdmin } from '../../../../lib/admin.js';
import { createServiceClient } from '../../../../lib/supabase/service.js';
import AdminUserDetail from '../../../../components/AdminUserDetail.jsx';

export default async function AdminUserDetailPage({ params }) {
  const { id: targetUserId } = await params;
  const { admin, supabase } = await requireAdmin('read_only');
  const service = createServiceClient();

  // Get target user
  let targetUser = null;
  try {
    const { data } = await service.auth.admin.getUserById(targetUserId);
    targetUser = data?.user || null;
  } catch {
    // fallback
  }

  if (!targetUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600">User not found.</p>
        <a href="/admin/users" className="text-blue-600 hover:underline text-sm mt-2 inline-block">← Back to Users</a>
      </div>
    );
  }

  // Subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  // Stats
  const { count: totalImages } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId);

  const { data: userImages } = await supabase
    .from('images')
    .select('id')
    .eq('user_id', targetUserId);

  const imageIds = (userImages || []).map((i) => i.id);
  let totalOutputs = 0;
  if (imageIds.length > 0) {
    const { count } = await supabase
      .from('processed_outputs')
      .select('*', { count: 'exact', head: true })
      .in('image_id', imageIds);
    totalOutputs = count || 0;
  }

  // Recent images
  const { data: recentImages } = await supabase
    .from('images')
    .select('id, original_filename, status, created_at')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Notes
  const { data: notes } = await supabase
    .from('user_notes')
    .select('*')
    .eq('user_id', targetUserId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // Audit log for this user
  const { data: auditLogs } = await supabase
    .from('admin_audit_log')
    .select('*')
    .eq('target_user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(20);

  const canEdit = ['support_admin', 'super_admin'].includes(admin.role);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <a href="/admin/users" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
        ← Back to Users
      </a>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {targetUser.email}
      </h1>

      <AdminUserDetail
        targetUser={{
          id: targetUser.id,
          email: targetUser.email,
          full_name: targetUser.user_metadata?.full_name || '',
          created_at: targetUser.created_at,
        }}
        subscription={sub}
        stats={{ totalImages: totalImages || 0, totalOutputs }}
        recentImages={recentImages || []}
        notes={notes || []}
        auditLogs={auditLogs || []}
        canEdit={canEdit}
        adminRole={admin.role}
      />
    </div>
  );
}
