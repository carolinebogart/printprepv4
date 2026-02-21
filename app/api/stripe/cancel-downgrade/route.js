import { createServerClient } from '../../../../lib/supabase/server.js';

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!sub) {
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    if (!sub.scheduled_plan_id && !sub.scheduled_plan_name) {
      return Response.json({ error: 'No scheduled downgrade to cancel' }, { status: 400 });
    }

    // Clear scheduled downgrade
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        scheduled_plan_id: null,
        scheduled_plan_name: null,
        scheduled_change_date: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Cancel downgrade error:', updateError);
      return Response.json({ error: 'Failed to cancel downgrade' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Cancel downgrade error:', err);
    return Response.json({ error: 'Failed to cancel downgrade' }, { status: 500 });
  }
}
