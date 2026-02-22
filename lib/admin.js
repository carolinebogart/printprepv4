import { createServerClient } from './supabase/server.js';
import { redirect } from 'next/navigation';

/**
 * Check admin access. Returns { user, admin, supabase } or redirects.
 * @param {string} minRole - 'read_only' | 'support_admin' | 'super_admin'
 */
export async function requireAdmin(minRole = 'read_only') {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/admin');

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!admin) redirect('/');

  const hierarchy = { read_only: 0, support_admin: 1, super_admin: 2 };
  const userLevel = hierarchy[admin.role] ?? -1;
  const requiredLevel = hierarchy[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    redirect('/admin'); // insufficient permissions, send to dashboard
  }

  return { user, admin, supabase };
}

/**
 * Check admin role for API routes. Returns { user, admin, supabase } or error response.
 */
export async function requireAdminApi(minRole = 'read_only') {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { status: 401, message: 'Unauthorized' } };
  }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!admin) {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  const hierarchy = { read_only: 0, support_admin: 1, super_admin: 2 };
  if ((hierarchy[admin.role] ?? -1) < (hierarchy[minRole] ?? 0)) {
    return { error: { status: 403, message: 'Insufficient permissions' } };
  }

  return { user, admin, supabase };
}

/**
 * Log an admin action to the audit log.
 */
export async function logAdminAction(supabase, {
  adminUserId,
  actionType,
  targetUserId = null,
  changes = null,
  adminNote = '',
  request = null,
}) {
  const rawIp = request?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() || request?.ip || null;
  // Validate it looks like an IP before passing to inet column
  const ip = rawIp && /^[\d.:a-fA-F]+$/.test(rawIp) ? rawIp : null;
  const userAgent = request?.headers?.get?.('user-agent') || null;

  const { error } = await supabase.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action_type: actionType,
    target_user_id: targetUserId,
    changes: changes ? JSON.stringify(changes) : null,
    admin_note: adminNote,
    ip_address: ip,
    user_agent: userAgent,
  });
  if (error) {
    console.error('[logAdminAction] Failed to insert audit log:', JSON.stringify({
      error,
      adminUserId,
      actionType,
      targetUserId,
    }));
  }
}
