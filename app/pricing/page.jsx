import { createServerClient } from '../../lib/supabase/server.js';
import { PRICING_TIERS } from '../../lib/stripe.js';
import PricingCards from '../../components/PricingCards.jsx';

export default async function PricingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let subscription = null;
  if (user) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    subscription = data;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="text-gray-600 mt-2">
          1 credit = 1 image processed into all selected sizes
        </p>
      </div>

      <PricingCards
        tiers={PRICING_TIERS}
        currentPlan={subscription?.plan_name || null}
        isLoggedIn={!!user}
      />
    </div>
  );
}
