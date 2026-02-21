import { createServerClient } from '../../../../lib/supabase/server.js';
import { stripe } from '../../../../lib/stripe.js';

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/account/subscription`,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    console.error('Portal error:', err);
    return Response.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
