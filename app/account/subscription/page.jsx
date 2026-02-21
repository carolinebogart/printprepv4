import { redirect } from 'next/navigation';
import { createServerClient } from '../../../lib/supabase/server.js';
import CancelDowngradeButton from '../../../components/CancelDowngradeButton.jsx';
import PortalButtonClient from '../../../components/PortalButton.jsx';

export default async function SubscriptionPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/account/subscription');

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!sub) redirect('/pricing');

  const isActive = ['active', 'trialing'].includes(sub.status);
  const creditsRemaining = Math.max(0, (sub.credits_total || 0) - (sub.credits_used || 0));
  const creditsPercent = sub.credits_total
    ? Math.round((creditsRemaining / sub.credits_total) * 100)
    : 0;

  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start).toLocaleDateString()
    : '—';
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString()
    : '—';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscription</h1>

      {/* Plan info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-xl font-bold text-gray-900 capitalize">{sub.plan_name || 'Free'}</p>
          </div>
          <span
            className={`badge ${
              isActive ? 'badge-success' : sub.status === 'past_due' ? 'badge-warning' : 'badge-error'
            }`}
          >
            {sub.status}
          </span>
        </div>

        {sub.cancel_at_period_end && (
          <div className="flash-warning mb-4">
            Your subscription will cancel at the end of the current period ({periodEnd}).
          </div>
        )}

        {sub.scheduled_plan_name && (
          <div className="flash-info mb-4">
            Downgrade to <strong className="capitalize">{sub.scheduled_plan_name}</strong> scheduled for {periodEnd}.
            <CancelDowngradeButton />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Billing Period</p>
            <p className="font-medium">{periodStart} — {periodEnd}</p>
          </div>
          <div>
            <p className="text-gray-500">Billing Interval</p>
            <p className="font-medium capitalize">{sub.plan_name?.startsWith('yearly') ? 'Yearly' : sub.plan_name?.startsWith('monthly') ? 'Monthly' : '—'}</p>
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Credits</h2>
        <div className="flex justify-between text-sm mb-1">
          <span>{creditsRemaining} remaining</span>
          <span>{sub.credits_used ?? 0} used of {sub.credits_total ?? 0}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${creditsPercent}%` }}
          />
        </div>
        {creditsRemaining < 10 && (
          <p className="text-xs text-amber-600 mt-2">
            Low credits! Consider upgrading your plan.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {sub.stripe_customer_id && (
          <PortalButton />
        )}
        <a href="/pricing" className="btn-secondary">
          {isActive ? 'Change Plan' : 'Upgrade'}
        </a>
        <a href="/account" className="text-sm text-gray-500 hover:underline self-center ml-auto">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}

function PortalButton() {
  return <PortalButtonClient />;
}
