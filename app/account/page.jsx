import { createServerClient } from '../../lib/supabase/server.js';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { creditsRemaining } from '../../lib/credits.js';

export default async function AccountDashboard() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/account');

  // Fetch subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Fetch image stats
  const { data: images } = await supabase
    .from('images')
    .select('id, uploaded_at, status, original_filename')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false });

  const allImages = images || [];
  const now = new Date();
  const thisMonth = allImages.filter((i) => {
    const d = new Date(i.uploaded_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const recentImages = allImages.slice(0, 5);

  const remaining = subscription ? creditsRemaining(subscription) : 0;
  const total = subscription?.credits_total || 0;
  const used = subscription?.credits_used || 0;
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Dashboard</h1>

      {/* Scheduled downgrade notice */}
      {subscription?.scheduled_plan_id && (
        <div className="flash-warning mb-6">
          Your plan is scheduled to change on{' '}
          {new Date(subscription.scheduled_change_date).toLocaleDateString()}.
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Credits Remaining</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{remaining}</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 rounded-full h-2 transition-all"
              style={{ width: `${Math.min(100, 100 - percentage)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{used} of {total} used</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Images Processed</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{allImages.length}</p>
          <p className="text-xs text-gray-400 mt-1">{thisMonth.length} this month</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Subscription</p>
          <p className="text-lg font-bold text-gray-900 mt-1 capitalize">
            {subscription?.plan_name?.replace(/_/g, ' ') || 'None'}
          </p>
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${
              subscription?.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {subscription?.status || 'inactive'}
          </span>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/account/settings"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900">Settings</h3>
          <p className="text-sm text-gray-500 mt-1">Update email & password</p>
        </Link>
        <Link
          href="/account/subscription"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900">Subscription</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your plan</p>
        </Link>
        <Link
          href="/account/usage"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow block"
        >
          <h3 className="font-semibold text-gray-900">Usage</h3>
          <p className="text-sm text-gray-500 mt-1">View detailed statistics</p>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Recent Activity</h2>
        {recentImages.length === 0 ? (
          <p className="text-sm text-gray-500">No images processed yet.</p>
        ) : (
          <div className="space-y-2">
            {recentImages.map((img) => (
              <div
                key={img.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm text-gray-900 truncate max-w-[300px]">
                    {img.original_filename}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(img.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    img.status === 'processed'
                      ? 'bg-green-100 text-green-700'
                      : img.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {img.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
