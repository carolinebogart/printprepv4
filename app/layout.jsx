import './globals.css';
import CreditsBadge from '../components/CreditsBadge.jsx';

export const metadata = {
  title: 'PrintPrep — Resize Artwork for Print',
  description: 'Resize your digital artwork to multiple print-ready formats at 300 DPI. Built for Etsy digital printable sellers.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

async function Nav() {
  // Server component — can check auth
  const { createClient } = await import('@/lib/supabase/server');
  let user = null;
  let subscription = null;
  let isAdmin = false;

  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('credits_total, credits_used, plan_name, status')
        .eq('user_id', user.id)
        .single();
      subscription = sub;

      const { data: admin } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (admin) isAdmin = true;
    }
  } catch {
    // Not authenticated or error — that's fine
  }

  const creditsRemaining = subscription
    ? Math.max(0, subscription.credits_total - subscription.credits_used)
    : 0;
  const creditsTotal = subscription?.credits_total || 0;
  const isActive = subscription?.status === 'active' ||
    (subscription?.status === 'cancelled' && creditsRemaining > 0);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
            PrintPrep
          </a>

          {/* Nav links */}
          <nav className="flex items-center gap-4">
            <a href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </a>

            {user && (
              <>
                <a href="/history" className="text-sm text-gray-600 hover:text-gray-900">
                  History
                </a>
                <a href="/account" className="text-sm text-gray-600 hover:text-gray-900">
                  Account
                </a>
              </>
            )}

            {isAdmin && (
              <a href="/admin" className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                Admin
              </a>
            )}

            {/* Credits badge — client component that refreshes on navigation */}
            {user && isActive && (
              <CreditsBadge
                initialRemaining={creditsRemaining}
                initialTotal={creditsTotal}
                initialActive={isActive}
              />
            )}

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{user.email}</span>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <a href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
                  Login
                </a>
                <a href="/auth/register" className="btn-primary btn-sm">
                  Sign Up
                </a>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-10 pb-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <a href="/" className="text-lg font-bold text-blue-600">PrintPrep</a>
            <p className="text-sm text-gray-500 mt-2">
              Resize your artwork to every print format, at 300 DPI, in seconds.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/how-it-works" className="text-gray-500 hover:text-gray-900">How It Works</a></li>
              <li><a href="/pricing" className="text-gray-500 hover:text-gray-900">Pricing</a></li>
              <li><a href="/faq" className="text-gray-500 hover:text-gray-900">FAQ</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="text-gray-500 hover:text-gray-900">About</a></li>
              <li><a href="/contact" className="text-gray-500 hover:text-gray-900">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/legal#terms" className="text-gray-500 hover:text-gray-900">Terms of Service</a></li>
              <li><a href="/legal#privacy" className="text-gray-500 hover:text-gray-900">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} PrintPrep. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
