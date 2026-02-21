import { redirect } from 'next/navigation';
import { createServerClient } from '../../../lib/supabase/server.js';

export default async function UsagePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/account/usage');

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // All-time stats
  const { count: totalImages } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: totalOutputs } = await supabase
    .from('processed_outputs')
    .select('*', { count: 'exact', head: true })
    .eq('image_id', user.id)  // we'll use a join approach below instead
    ;

  // Actually get output count via images belonging to user
  const { data: userImages } = await supabase
    .from('images')
    .select('id')
    .eq('user_id', user.id);

  const imageIds = (userImages || []).map((i) => i.id);
  let outputCount = 0;
  if (imageIds.length > 0) {
    const { count } = await supabase
      .from('processed_outputs')
      .select('*', { count: 'exact', head: true })
      .in('image_id', imageIds);
    outputCount = count || 0;
  }

  // This month stats
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: monthImages } = await supabase
    .from('images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', monthStart.toISOString());

  // 30-day timeline
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentImages } = await supabase
    .from('images')
    .select('id, original_filename, status, created_at')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // Credit calculations
  const creditsTotal = sub?.credits_total || 0;
  const creditsUsed = sub?.credits_used || 0;
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditsPercent = creditsTotal
    ? Math.round((creditsRemaining / creditsTotal) * 100)
    : 0;

  const periodStart = sub?.current_period_start
    ? new Date(sub.current_period_start).toLocaleDateString()
    : '—';
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString()
    : '—';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Usage Statistics</h1>

      {/* Billing period + credits */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Current Billing Period</p>
            <p className="font-medium">{periodStart} — {periodEnd}</p>
          </div>
          <span className="text-sm text-gray-500 capitalize">{sub?.plan_name || 'Free'} Plan</span>
        </div>

        <div className="flex justify-between text-sm mb-1">
          <span>Credits: {creditsRemaining} remaining</span>
          <span>{creditsUsed} / {creditsTotal} used</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
          <div
            className={`h-3 rounded-full transition-all ${creditsPercent < 20 ? 'bg-red-500' : 'bg-blue-600'}`}
            style={{ width: `${creditsPercent}%` }}
          />
        </div>
        {creditsRemaining < 10 && creditsTotal > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Low credits — <a href="/pricing" className="underline">upgrade your plan</a>
          </p>
        )}
      </div>

      {/* All-time stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Images" value={totalImages || 0} />
        <StatCard label="Total Outputs" value={outputCount} />
        <StatCard label="This Month" value={monthImages || 0} />
      </div>

      {/* 30-day timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Last 30 Days</h2>
        {(!recentImages || recentImages.length === 0) ? (
          <p className="text-sm text-gray-500">No images processed in the last 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 font-medium text-gray-500">Date</th>
                  <th className="pb-2 font-medium text-gray-500">Filename</th>
                  <th className="pb-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentImages.map((img) => (
                  <tr key={img.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-600">
                      {new Date(img.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-gray-900 truncate max-w-[200px]">
                      {img.original_filename}
                    </td>
                    <td className="py-2">
                      <span
                        className={`badge ${
                          img.status === 'processed'
                            ? 'badge-success'
                            : img.status === 'failed'
                            ? 'badge-error'
                            : 'badge-warning'
                        }`}
                      >
                        {img.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <a href="/account" className="text-sm text-gray-500 hover:underline">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
