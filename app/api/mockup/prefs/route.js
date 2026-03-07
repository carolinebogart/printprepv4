import { createServerClient } from '../../../../lib/supabase/server.js';
import { createServiceClient } from '../../../../lib/supabase/service.js';

// GET /api/mockup/prefs — fetch user prefs + available scenes/frames
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'authentication_required' }, { status: 401 });

  const service = createServiceClient();

  const [{ data: prefs }, { data: scenes }, { data: frames }] = await Promise.all([
    supabase.from('user_mockup_prefs').select('*').eq('user_id', user.id).single(),
    service.from('mockup_scenes').select('id, name').eq('is_active', true).order('name'),
    service.from('mockup_frames').select('id, name').eq('is_active', true).order('name'),
  ]);

  return Response.json({ prefs: prefs ?? null, scenes: scenes ?? [], frames: frames ?? [] });
}

// POST /api/mockup/prefs — upsert user mockup prefs
export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'authentication_required' }, { status: 401 });

  const body = await request.json();

  const { error } = await supabase
    .from('user_mockup_prefs')
    .upsert({
      user_id: user.id,
      auto_mockup: body.auto_mockup ?? false,
      default_scene_id: body.default_scene_id || null,
      default_frame_id: body.default_frame_id || null,
      default_mat_color: body.default_mat_color || null,
      default_mat_thickness_px: body.default_mat_thickness_px || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
