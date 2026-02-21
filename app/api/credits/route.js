import { createServerClient } from '../../../lib/supabase/server.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ remaining: 0, total: 0 }, { status: 401 });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('credits_total, credits_used, status')
      .eq('user_id', user.id)
      .single();

    if (!sub) {
      return Response.json({ remaining: 0, total: 0, active: false });
    }

    const remaining = Math.max(0, sub.credits_total - sub.credits_used);
    const active = sub.status === 'active' || (sub.status === 'cancelled' && remaining > 0);

    return Response.json({ remaining, total: sub.credits_total, active });
  } catch {
    return Response.json({ remaining: 0, total: 0, active: false });
  }
}
