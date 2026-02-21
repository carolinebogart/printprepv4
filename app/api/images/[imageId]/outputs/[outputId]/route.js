import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../../../lib/supabase/server.js';

// DELETE /api/images/[imageId]/outputs/[outputId] — delete single output
export async function DELETE(request, { params }) {
  const { imageId, outputId } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership via join (output -> image -> user)
  const { data: image } = await supabase
    .from('images')
    .select('id')
    .eq('id', imageId)
    .eq('user_id', user.id)
    .single();

  if (!image) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: output } = await supabase
    .from('processed_outputs')
    .select('id, storage_path')
    .eq('id', outputId)
    .eq('image_id', imageId)
    .single();

  if (!output) {
    return NextResponse.json({ error: 'Output not found' }, { status: 404 });
  }

  // Delete file from storage
  if (output.storage_path) {
    await supabase.storage
      .from('printprep-images')
      .remove([output.storage_path]);
  }

  // Delete record
  await supabase
    .from('processed_outputs')
    .delete()
    .eq('id', outputId);

  return NextResponse.json({ success: true });
}
