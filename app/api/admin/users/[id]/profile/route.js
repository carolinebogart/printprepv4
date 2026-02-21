import { NextResponse } from 'next/server';
import { requireAdminApi, logAdminAction } from '../../../../../../lib/admin.js';
import { createServiceClient } from '../../../../../../lib/supabase/service.js';

export async function POST(request, { params }) {
  const { id: targetUserId } = await params;
  const result = await requireAdminApi('support_admin');
  if (result.error) {
    return NextResponse.json({ message: result.error.message }, { status: result.error.status });
  }

  const { user, admin, supabase } = result;
  const body = await request.json();
  const { email, full_name, admin_note } = body;

  if (!admin_note?.trim()) {
    return NextResponse.json({ message: 'Admin note is required.' }, { status: 400 });
  }

  const service = createServiceClient();

  // Get current user data for audit
  let oldData = {};
  try {
    const { data } = await service.auth.admin.getUserById(targetUserId);
    oldData = {
      email: data?.user?.email,
      full_name: data?.user?.user_metadata?.full_name,
    };
  } catch {}

  // Update user via admin API
  const updates = {};
  if (email && email !== oldData.email) updates.email = email;
  if (full_name !== undefined) updates.user_metadata = { full_name };

  if (Object.keys(updates).length > 0) {
    const { error } = await service.auth.admin.updateUserById(targetUserId, updates);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  await logAdminAction(supabase, {
    adminUserId: user.id,
    actionType: 'profile_update',
    targetUserId,
    changes: {
      before: oldData,
      after: { email: email || oldData.email, full_name },
    },
    adminNote: admin_note,
    request,
  });

  return NextResponse.json({ success: true });
}
