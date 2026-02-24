import UploadForm from '@/components/UploadForm';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { createClient } = await import('@/lib/supabase/server');
  let user = null;
  let subscription = null;

  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      subscription = sub;
    }
  } catch {
    // Not authenticated
  }

  const creditsRemaining = subscription
    ? Math.max(0, subscription.credits_total - subscription.credits_used)
    : 0;
  const isActive = subscription?.status === 'active' ||
    (subscription?.status === 'cancelled' && creditsRemaining > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Resize Your Artwork for Every Print Format
        </h1>
        <p className="text-lg text-gray-600">
          Upload once, get every size — 300 DPI, print-ready, in seconds.
        </p>
      </div>

      {/* Status banners */}
      {!user && (
        <div className="flash-info mb-6 text-center">
          <a href="/auth/login" className="font-medium underline">Log in</a> or{' '}
          <a href="/auth/register" className="font-medium underline">sign up</a>{' '}
          to start resizing your artwork.
        </div>
      )}

      {user && !isActive && (
        <div className="flash-warning mb-6 text-center">
          You need an active subscription to process images.{' '}
          <a href="/pricing" className="font-medium underline">View plans</a>
        </div>
      )}

      {user && isActive && creditsRemaining <= 0 && (
        <div className="flash-error mb-6 text-center">
          You&apos;re out of credits.{' '}
          <a href="/pricing" className="font-medium underline">Upgrade your plan</a>{' '}
          or wait for your next billing cycle.
        </div>
      )}

      {/* Upload form */}
      <UploadForm
        isLoggedIn={!!user}
        isActive={isActive}
        hasCredits={creditsRemaining > 0}
      />

      {/* How It Works */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: 1, title: 'Upload', desc: 'Upload your high-resolution artwork (up to 300MB).' },
            { step: 2, title: 'Crop', desc: 'Adjust the crop for each print ratio. The tool shows exactly what gets cut.' },
            { step: 3, title: 'Generate', desc: 'We create every selected size at 300 DPI, ready for print.' },
            { step: 4, title: 'Download', desc: 'Download individual files or a ZIP of everything.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold mb-3">
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Built for Etsy Digital Printable Sellers</h2>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            All standard print ratios: 2:3, 3:4, 4:5, 8:11, and A-Series (ISO)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Portrait and landscape orientations auto-detected
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            300 DPI output with proper metadata for professional printing
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Custom background color, eyedropper tool, and transparent PNG support
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Optional drop shadow for padded images
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            Download individual files or a complete ZIP bundle
          </li>
        </ul>
      </div>
    </div>
  );
}
