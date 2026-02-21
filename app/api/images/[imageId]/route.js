import { NextResponse } from 'next/server';
import { createServerClient } from '../../../../lib/supabase/server.js';

// DELETE /api/images/[imageId] — delete image + all outputs
export async function DELETE(request, { params }) {
  const { imageId } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: image, error: imgErr } = await supabase
    .from('images')
    .select('*')
    .eq('id', imageId)
    .eq('user_id', user.id)
    .single();

  if (imgErr || !image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Fetch all outputs
  const { data: outputs } = await supabase
    .from('processed_outputs')
    .select('id, storage_path')
    .eq('image_id', imageId);

  // Delete output files from storage
  if (outputs && outputs.length > 0) {
    const outputPaths = outputs.map((o) => o.storage_path).filter(Boolean);
    if (outputPaths.length > 0) {
      await supabase.storage
        .from('printprep-images')
        .remove(outputPaths);
    }

    // Delete output records
    await supabase
      .from('processed_outputs')
      .delete()
      .eq('image_id', imageId);
  }

  // Delete original file from storage
  if (image.storage_path) {
    await supabase.storage
      .from('printprep-images')
      .remove([image.storage_path]);
  }

  // Delete image record
  await supabase
    .from('images')
    .delete()
    .eq('id', imageId);

  return NextResponse.json({ success: true });
}
