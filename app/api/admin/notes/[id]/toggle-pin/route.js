import { NextResponse } from 'next/server';
import { requireAdminApi } from '../../../../../../lib/admin.js';

export async function POST(request, { params }) {
  const { id: noteId } = await params;
  const result = await requireAdminApi('support_admin');
  if (result.error) {
    return NextResponse.json({ message: result.error.message }, { status: result.error.status });
  }

  const { supabase } = result;

  // Get current pin state
  const { data: note } = await supabase
    .from('user_notes')
    .select('is_pinned')
    .eq('id', noteId)
    .single();

  if (!note) {
    return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
  }

  // Toggle
  const { error } = await supabase
    .from('user_notes')
    .update({ is_pinned: !note.is_pinned })
    .eq('id', noteId);

  if (error) {
    return NextResponse.json({ message: 'Failed to toggle pin.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, is_pinned: !note.is_pinned });
}
