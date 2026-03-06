import './globals.css';
import CreditsBadge from '../components/CreditsBadge.jsx';

export const metadata = {
  title: 'All Good Web — Tools for Creative Sellers',
  description: 'Self-service tools for Etsy sellers and digital creators. Resize artwork for print, convert image formats, and more.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

async function SiteNav() {
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
    // Not authenticated — fine
  }

  const creditsRemaining = subscription
    ? Math.max(0, subscription.credits_total - subscription.credits_used)
    : 0;
  const creditsTotal = subscription?.credits_total || 0;
  const isActive = subscription?.status === 'active' ||
    (subscription?.status === 'cancelled' && creditsRemaining > 0);

  return (
    <header style={{
      background: 'var(--agw-navy)',
      borderBottom: '3px solid var(--agw-gold)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '52px' }}>

          {/* Logo — large enough to read clearly */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/allgoodweb-logo.jpg" alt="All Good Web" style={{ height: '44px', width: '44px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
            <span style={{
              fontFamily: 'var(--font-sub)',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.08em',
              color: 'var(--agw-cream)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>All Good Web</span>
          </a>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a href="/printprep" style={navLinkStyle}>PrintPrep</a>
            <a href="/convert" style={navLinkStyle}>Convert</a>
            <a href="/blog" style={navLinkStyle}>Blog</a>
            <a href="/about" style={navLinkStyle}>About</a>

            {user && (
              <>
                <a href="/history" style={navLinkStyle}>History</a>
                <a href="/account" style={navLinkStyle}>Account</a>
              </>
            )}

            {isAdmin && (
              <a href="/admin" style={{ ...navLinkStyle, color: 'var(--agw-gold)' }}>Admin</a>
            )}

            {user && isActive && (
              <CreditsBadge
                initialRemaining={creditsRemaining}
                initialTotal={creditsTotal}
                initialActive={isActive}
              />
            )}

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--agw-steel)', letterSpacing: '0.05em' }}>{user.email}</span>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" style={navLinkStyle}>Logout</button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a href="/auth/login" style={navLinkStyle}>Login</a>
                <a href="/auth/register" style={{
                  fontFamily: 'var(--font-sub)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--agw-cream)',
                  background: 'var(--agw-red)',
                  border: '2px solid var(--agw-red)',
                  borderRadius: '2px',
                  padding: '0.3rem 0.85rem',
                  textDecoration: 'none',
                }}>Try Free →</a>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

const navLinkStyle = {
  fontFamily: 'var(--font-sub)',
  fontWeight: 500,
  fontSize: '0.8rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--agw-cream)',
  textDecoration: 'none',
  opacity: 0.85,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
};

function SiteFooter() {
  return (
    <footer style={{ background: 'var(--agw-navy)', borderTop: '3px solid var(--agw-gold)', paddingTop: '3rem', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ color: 'var(--agw-gold)', fontSize: '1.4rem', letterSpacing: '0.5rem' }}>✦ ✦ ✦</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          {/* Brand — larger logo in footer */}
          <div style={{ gridColumn: 'span 2' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', marginBottom: '1rem' }}>
              <img src="/allgoodweb-logo.jpg" alt="All Good Web" style={{ height: '64px', width: '64px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sub)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.08em', color: 'var(--agw-cream)', textTransform: 'uppercase', lineHeight: 1.2 }}>All Good Web</span>
            </a>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--agw-steel)', lineHeight: 1.6, maxWidth: '240px' }}>
              Self-service tools for creative sellers. More tools coming soon.
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--agw-gold)', letterSpacing: '0.1em', marginTop: '0.75rem', textTransform: 'uppercase' }}>★ Est. 2025 ★</p>
          </div>

          {/* Tools */}
          <div>
            <h4 style={footerHeadStyle}>Tools</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><a href="/printprep" style={footerLinkStyle}>PrintPrep</a></li>
              <li><a href="/convert" style={footerLinkStyle}>Image Converter</a></li>
            </ul>
          </div>

          {/* PrintPrep */}
          <div>
            <h4 style={footerHeadStyle}>PrintPrep</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><a href="/pricing" style={footerLinkStyle}>Pricing</a></li>
              <li><a href="/faq" style={footerLinkStyle}>FAQ</a></li>
              <li><a href="/how-it-works" style={footerLinkStyle}>How It Works</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 style={footerHeadStyle}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><a href="/about" style={footerLinkStyle}>About</a></li>
              <li><a href="/blog" style={footerLinkStyle}>Blog</a></li>
              <li><a href="/contact" style={footerLinkStyle}>Contact</a></li>
              <li><a href="/legal#terms" style={footerLinkStyle}>Terms</a></li>
              <li><a href="/legal#privacy" style={footerLinkStyle}>Privacy</a></li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(245,233,200,0.12)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--agw-steel)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            &copy; {new Date().getFullYear()} All Good Web &nbsp;·&nbsp; All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

const footerHeadStyle = {
  fontFamily: 'var(--font-sub)',
  fontWeight: 600,
  fontSize: '0.7rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--agw-gold)',
  marginBottom: '0.75rem',
};

const footerLinkStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  color: 'var(--agw-cream)',
  textDecoration: 'none',
  opacity: 0.7,
};
