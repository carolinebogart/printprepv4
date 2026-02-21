import { createServerClient } from '../../../lib/supabase/server.js';
import { stripe, getPlanFromPriceId } from '../../../lib/stripe.js';
import { getCreditsForPlan } from '../../../lib/credits.js';
import { createServiceClient } from '../../../lib/supabase/service.js';
import Link from 'next/link';

export default async function PaymentSuccessPage({ searchParams }) {
  const { session_id } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let planName = null;
  let credits = 0;
  let synced = false;

  if (session_id && user) {
    // Verify the checkout session
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.metadata?.user_id === user.id) {
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = stripeSubscription.items.data[0]?.price?.id;
        planName = getPlanFromPriceId(priceId);
        credits = getCreditsForPlan(planName);

        // Handle race condition: if webhook hasn't arrived yet, sync manually
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!sub || sub.stripe_subscription_id !== session.subscription) {
          const serviceClient = createServiceClient();
          const subData = {
            user_id: user.id,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan_name: planName,
            status: 'active',
            credits_total: credits,
            credits_used: 0,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          };

          if (sub) {
            await serviceClient.from('subscriptions').update(subData).eq('user_id', user.id);
          } else {
            await serviceClient.from('subscriptions').insert(subData);
          }
          synced = true;
        }
      }
    } catch (err) {
      console.error('Success page session verification error:', err);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
      <p className="text-gray-600 mb-6">
        {planName
          ? `You're now on the ${planName.replace(/_/g, ' ')} plan with ${credits} credits.`
          : 'Your subscription is now active.'}
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/" className="btn-primary">
          Start Processing Images
        </Link>
        <Link href="/account" className="btn-secondary">
          View Account
        </Link>
      </div>
    </div>
  );
}
