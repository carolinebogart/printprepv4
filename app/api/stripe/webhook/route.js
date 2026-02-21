import { stripe, getPlanFromPriceId } from '../../../../lib/stripe.js';
import { createServiceClient } from '../../../../lib/supabase/service.js';
import { getCreditsForPlan } from '../../../../lib/credits.js';

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object, event.data.previous_attributes);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object);
        break;

      default:
        // Unhandled event type — acknowledge it
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    // Still return 200 to prevent Stripe retries for handler errors
  }

  return Response.json({ received: true });
}

async function handleCheckoutCompleted(supabase, session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error('checkout.session.completed: No user_id in metadata');
    return;
  }

  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Retrieve the full subscription to get price info
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = stripeSubscription.items.data[0]?.price?.id;
  const planName = getPlanFromPriceId(priceId);
  const credits = getCreditsForPlan(planName);

  // Check existing subscription for credit carry-over (upgrade scenario)
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  let bonusCredits = 0;
  if (existing && existing.status === 'active') {
    // Upgrading — carry over unused credits from old plan
    const oldCreditsRemaining = (existing.credits_total || 0) - (existing.credits_used || 0);
    if (oldCreditsRemaining > 0) {
      bonusCredits = oldCreditsRemaining;
    }
  }

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_name: planName,
    status: 'active',
    credits_total: credits + bonusCredits,
    credits_used: 0,
    current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    scheduled_plan_id: null,
    scheduled_plan_name: null,
    scheduled_change_date: null,
  };

  if (existing) {
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('subscriptions')
      .insert(subscriptionData);
  }
}

async function handleSubscriptionUpdated(supabase, subscription, previousAttributes) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const isRenewal = previousAttributes && 'current_period_start' in previousAttributes;

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!existing) return;

  if (isRenewal) {
    // Check for scheduled downgrade
    if (existing.scheduled_plan_id) {
      const newPlan = getPlanFromPriceId(existing.scheduled_plan_id);
      const newCredits = getCreditsForPlan(newPlan);

      // Apply the scheduled downgrade
      await supabase
        .from('subscriptions')
        .update({
          plan_name: newPlan,
          credits_total: newCredits,
          credits_used: 0,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          scheduled_plan_id: null,
          scheduled_plan_name: null,
          scheduled_change_date: null,
        })
        .eq('id', existing.id);

      // Update the Stripe subscription to the new price
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: existing.scheduled_plan_id,
        }],
      });
    } else {
      // Normal renewal — reset credits
      await supabase
        .from('subscriptions')
        .update({
          credits_used: 0,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', existing.id);
    }
  } else {
    // Mid-cycle change
    const priceId = subscription.items.data[0]?.price?.id;
    const newPlan = getPlanFromPriceId(priceId);

    if (newPlan && newPlan !== existing.plan_name) {
      const newCredits = getCreditsForPlan(newPlan);

      await supabase
        .from('subscriptions')
        .update({
          plan_name: newPlan,
          credits_total: newCredits,
        })
        .eq('id', existing.id);
    }
  }

  // Handle cancel_at_period_end
  if (subscription.cancel_at_period_end) {
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id);
  } else if (existing.status === 'cancelled') {
    // Reactivation
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('stripe_subscription_id', subscription.id);
  }
}

async function handleSubscriptionDeleted(supabase, subscription) {
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentFailed(supabase, invoice) {
  if (invoice.subscription) {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', invoice.subscription);
  }
}
