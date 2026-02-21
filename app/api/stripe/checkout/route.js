import { createServerClient } from '../../../../lib/supabase/server.js';
import { stripe, getPriceIdFromPlan } from '../../../../lib/stripe.js';

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { priceId: planId } = await request.json();

    // Resolve plan name to Stripe price ID
    const priceId = getPriceIdFromPlan(planId);
    if (!priceId) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check for existing subscription — handle downgrade vs upgrade
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If user has an active subscription, check if this is a downgrade
    if (subscription && subscription.status === 'active' && subscription.stripe_customer_id) {
      const { isDowngrade } = await import('../../../../lib/credits.js');
      if (isDowngrade(subscription.plan_name, planId)) {
        // Schedule downgrade instead of immediate checkout
        const { createServiceClient } = await import('../../../../lib/supabase/service.js');
        const serviceClient = createServiceClient();

        // Extract plan name for display (e.g., 'starter_monthly' -> 'starter')
        const scheduledPlanName = planId.replace(/_monthly|_yearly/, '');

        await serviceClient
          .from('subscriptions')
          .update({
            scheduled_plan_id: priceId,
            scheduled_plan_name: scheduledPlanName,
            scheduled_change_date: subscription.current_period_end,
          })
          .eq('user_id', user.id);

        return Response.json({
          success: true,
          scheduled: true,
          message: `Your plan will change on ${new Date(subscription.current_period_end).toLocaleDateString()}`,
        });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create checkout session
    const sessionParams = {
      customer_email: user.email,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    };

    // If user already has a Stripe customer ID, use it
    if (subscription?.stripe_customer_id) {
      delete sessionParams.customer_email;
      sessionParams.customer = subscription.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
