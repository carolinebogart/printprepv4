import { createServiceClient } from '../../../../../lib/supabase/service.js';
import { requireAdminApi, logAdminAction } from '../../../../../lib/admin.js';

export async function POST(request) {
  const adminCheck = await requireAdminApi('super_admin');
  if (adminCheck.error) {
    return Response.json({ error: adminCheck.error.message }, { status: adminCheck.error.status });
  }

  const { before_date, admin_note } = await request.json();

  if (!before_date) {
    return Response.json({ error: 'before_date is required' }, { status: 400 });
  }

  if (!admin_note || admin_note.trim().length < 5) {
    return Response.json({ error: 'Admin note is required (min 5 characters)' }, { status: 400 });
  }

  const service = createServiceClient();

  // Count entries to be deleted
  const { count } = await service
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', before_date);

  if (count === 0) {
    return Response.json({ error: 'No entries found before that date' }, { status: 400 });
  }

  // Delete entries
  const { error: deleteError } = await service
    .from('admin_audit_log')
    .delete()
    .lt('created_at', before_date);

  if (deleteError) {
    return Response.json({ error: 'Failed to truncate audit log' }, { status: 500 });
  }

  // Log the truncation itself
  await logAdminAction(service, {
    adminUserId: adminCheck.admin.id,
    actionType: 'audit_log_truncate',
    adminNote: admin_note.trim(),
    changes: { before_date, entries_deleted: count },
    request,
  });

  return Response.json({ success: true, deleted: count });
}
