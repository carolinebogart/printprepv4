import { requireAdminApi } from '../../../../../../lib/admin.js';
import { createServiceClient } from '../../../../../../lib/supabase/service.js';

// PATCH /api/admin/mockups/frames/[id] — update is_active or is_default
export async function PATCH(request, { params }) {
  const auth = await requireAdminApi('support_admin');
  if (auth.error) return Response.json({ error: auth.error.message }, { status: auth.error.status });

  const { id } = await params;
  const body = await request.json();
  const service = createServiceClient();

  try {
    if (body.is_default === true) {
      await service.from('mockup_frames').update({ is_default: false }).eq('is_default', true);
    }

    const allowed = {};
    if (body.is_active !== undefined) allowed.is_active = body.is_active;
    if (body.is_default !== undefined) allowed.is_default = body.is_default;

    const { data, error } = await service
      .from('mockup_frames')
      .update(allowed)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return Response.json({ frame: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
