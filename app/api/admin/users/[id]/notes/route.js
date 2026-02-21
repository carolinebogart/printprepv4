import { NextResponse } from 'next/server';
import { requireAdminApi, logAdminAction } from '../../../../../../lib/admin.js';

export async function POST(request, { params }) {
  const { id: targetUserId } = await params;
  const result = await requireAdminApi('support_admin');
  if (result.error) {
    return NextResponse.json({ message: result.error.message }, { status: result.error.status });
  }

  const { user, supabase } = result;
  const body = await request.json();
  const { type, content, is_pinned } = body;

  if (!content?.trim()) {
    return NextResponse.json({ message: 'Note content is required.' }, { status: 400 });
  }

  const validTypes = ['general', 'support', 'billing', 'warning', 'ban'];
  const noteType = validTypes.includes(type) ? type : 'general';

  const { error } = await supabase
    .from('user_notes')
    .insert({
      user_id: targetUserId,
      admin_user_id: user.id,
      note_type: noteType,
      content: content.trim(),
      is_pinned: !!is_pinned,
    });

  if (error) {
    return NextResponse.json({ message: 'Failed to add note.' }, { status: 500 });
  }

  await logAdminAction(supabase, {
    adminUserId: user.id,
    actionType: 'note_added',
    targetUserId,
    changes: { note_type: noteType, content: content.trim(), is_pinned: !!is_pinned },
    adminNote: `Added ${noteType} note`,
    request,
  });

  return NextResponse.json({ success: true });
}
