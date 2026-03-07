import { createClient } from '@/lib/supabase/server';
import UploadForm from '@/components/UploadForm';

export const metadata = {
  title: 'PrintPrep — Resize Artwork for Every Print Format',
  description: 'Upload once, get every print size at 300 DPI. Built for Etsy digital printable sellers. 2:3, 3:4, 4:5, 8:11, A-Series and more.',
};

const ratios = [
  { ratio: '2:3', sizes: '4×6 · 6×9 · 8×12 · 10×15 · 12×18 · 16×24 · 20×30 · 24×36 · 28×42 · 32×48 · 36×54 · 40×60' },
  { ratio: '3:4', sizes: '6×8 · 9×12 · 12×16 · 15×20 · 18×24 · 24×32 · 30×40 · 36×48' },
  { ratio: '4:5', sizes: '8×10 · 12×15 · 16×20 · 20×25 · 24×30 · 32×40 · 40×50 · 48×60' },
  { ratio: 'Letter', sizes: '8.5×11' },
  { ratio: '11×14', sizes: '11×14' },
  { ratio: '11×17', sizes: '11×17' },
  { ratio: 'A-Series', sizes: 'A7 · A6 · A5 · A4 · A3 · A2 · A1 · A0' },
  { ratio: 'Freeform', sizes: 'Custom W×H (px or in)' },
];

const features = [
  {
    icon: '⬤',
    title: '300 DPI, Always',
    body: 'Every output has proper DPI metadata embedded. Your buyers get files that print correctly at their local print shop — no guesswork.',
  },
  {
    icon: '◈',
    title: 'Lanczos3 Resampling',
    body: "Professional-grade upscaling algorithm. Your art stays sharp at large print sizes — not blurry or pixelated like a simple resize.",
  },
  {
    icon: '◉',
    title: 'Custom Backgrounds',
    body: 'Set any hex color as the fill for padded images. Use the eyedropper to sample directly from your artwork, or choose transparent PNG output.',
  },
  {
    icon: '◈',
    title: 'Precision Crop Tool',
    body: "The crop box stays fixed. You move the image behind it. You see exactly what gets cropped — no surprises in the output.",
  },
  {
    icon: '⬤',
    title: 'ZIP Download',
    body: 'Download all output sizes as a single ZIP bundle. Or grab individual files. File names include exact dimensions so buyers know what they got.',
  },
  {
    icon: '◉',
    title: 'Optional Drop Shadow',
    body: 'Add a subtle drop shadow to padded images — great for art that floats on a colored background.',
  },
];

export default async function PrintPrepPage() {
  // Auth check + subscription fetch
  let user = null;
  let subscription = null;

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
    }
  } catch {
    // Not authenticated — fine
  }

  const creditsRemaining = subscription
    ? Math.max(0, subscription.credits_total - subscription.credits_used)
    : 0;
  const isLoggedIn = !!user;
  const isActive = subscription?.status === 'active' ||
    (subscription?.status === 'cancelled' && creditsRemaining > 0);
  const hasCredits = creditsRemaining > 0;

  return (
    <div style={{ background: 'var(--agw-cream)', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ background: 'var(--agw-navy)', borderBottom: '2px solid var(--agw-gold)', padding: '0.9rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--agw-cream)', lineHeight: 1, margin: 0 }}>PrintPrep</h1>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--agw-gold)' }}>Resize art for every print format · from $29/mo</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {!isLoggedIn && (
              <a href="/auth/register" style={{ fontFamily: 'var(--font-sub)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--agw-cream)', background: 'var(--agw-red)', padding: '0.35rem 0.9rem', textDecoration: 'none', borderRadius: '2px' }}>Start Free →</a>
            )}
            <a href="/pricing" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--agw-steel)', textDecoration: 'none' }}>Pricing</a>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      {isLoggedIn ? (
        <UploadSection isLoggedIn={isLoggedIn} isActive={isActive} hasCredits={hasCredits} />
      ) : (
        <UploadSection isLoggedIn={false} isActive={false} hasCredits={false} />
      )}

      {/* Ratios + sizes section */}
      <section style={{ background: 'var(--agw-cream)', padding: '5rem 1.5rem', borderBottom: '4px solid var(--agw-navy)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-red)', display: 'block', marginBottom: '0.4rem' }}>What You Get</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'var(--agw-navy)', lineHeight: 1.1 }}>
              Every Ratio. Every Size.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--agw-steel)', marginTop: '0.8rem', maxWidth: '600px', margin: '0.8rem auto 0' }}>
              Standard ratios plus a <strong>Custom Size</strong> feature to create any dimension you need.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--agw-navy)', border: '2px solid var(--agw-navy)', borderRadius: '4px', overflow: 'hidden' }}>
            {ratios.map(({ ratio, sizes }) => (
              <div key={ratio} style={{ background: 'white', padding: '1.75rem 1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--agw-navy)', marginBottom: '0.6rem', lineHeight: 1 }}>{ratio}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--agw-steel)', lineHeight: 1.8, letterSpacing: '0.05em' }}>{sizes.split(' · ').join('\n')}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginTop: '1rem' }}>
            Portrait and landscape orientations for all standard ratios
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ background: 'var(--agw-dark)', padding: '5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(245,233,200,0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-gold)', display: 'block', marginBottom: '0.4rem' }}>The Details</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'var(--agw-cream)', lineHeight: 1.1 }}>
              Built for Professional Output
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {features.map(({ icon, title, body }) => (
              <div key={title} style={{
                border: '1px solid rgba(245,233,200,0.1)',
                borderRadius: '2px',
                padding: '2rem',
                background: 'rgba(245,233,200,0.02)',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--agw-gold)', marginBottom: '0.75rem' }}>{icon}</div>
                <h3 style={{ fontFamily: 'var(--font-sub)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--agw-cream)', marginBottom: '0.6rem' }}>{title}</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--agw-steel)' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section style={{ background: 'var(--agw-red)', padding: '4rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(245,233,200,0.06) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }} />
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--agw-cream)', lineHeight: 1.05, marginBottom: '1rem' }}>
            Simple, Credit-Based Pricing
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', color: 'rgba(245,233,200,0.85)', marginBottom: '0.75rem', lineHeight: 1.65 }}>
            One credit processes one image into all your selected sizes. Plans start at $29.99/mo for 30 credits.
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(245,233,200,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
            Starter · Professional · Enterprise
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/pricing" style={{
              fontFamily: 'var(--font-sub)', fontWeight: 700,
              fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--agw-red)', background: 'var(--agw-cream)',
              padding: '0.9rem 2.5rem', textDecoration: 'none', borderRadius: '2px',
              border: '2px solid var(--agw-cream)',
            }}>View Pricing →</a>
            <a href="/auth/register" style={{
              fontFamily: 'var(--font-sub)', fontWeight: 600,
              fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--agw-cream)', background: 'transparent',
              padding: '0.9rem 2.5rem', textDecoration: 'none', borderRadius: '2px',
              border: '2px solid rgba(245,233,200,0.5)',
            }}>Sign Up Free</a>
          </div>
        </div>
      </section>

    </div>
  );
}

/* ─── UPLOAD SECTION ────────────────────────────────────────────────── */
function UploadSection({ isLoggedIn, isActive, hasCredits }) {
  if (isLoggedIn && isActive && hasCredits) {
    // Show the upload form
    return (
      <section style={{ background: 'var(--agw-cream)', borderBottom: '3px solid var(--agw-navy)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: 'var(--agw-navy)',
              lineHeight: 1.1,
              marginBottom: '0.5rem',
            }}>Upload Your Artwork</h2>
            <p style={{
              fontFamily: 'var(--font-sub)',
              fontWeight: 600,
              fontSize: '0.9rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--agw-red)',
            }}>One image → every print size at 300 DPI</p>
          </div>
          <UploadForm isLoggedIn={true} isActive={true} hasCredits={true} />
        </div>
      </section>
    );
  }

  if (isLoggedIn && isActive && !hasCredits) {
    // No credits
    return (
      <section style={{ background: 'var(--agw-navy)', borderBottom: '3px solid var(--agw-gold)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            background: 'rgba(232,163,42,0.1)',
            border: '2px solid var(--agw-gold)',
            borderRadius: '4px',
            padding: '2rem',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: 'var(--agw-cream)',
              marginBottom: '0.75rem',
            }}>No Credits Remaining</h2>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              color: 'var(--agw-steel)',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>You've used all your credits. Upgrade your plan to continue processing images.</p>
            <a href="/pricing" style={{
              fontFamily: 'var(--font-sub)',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--agw-red)',
              background: 'var(--agw-cream)',
              padding: '0.85rem 2rem',
              textDecoration: 'none',
              borderRadius: '2px',
              border: '2px solid var(--agw-cream)',
              display: 'inline-block',
            }}>View Plans →</a>
          </div>
        </div>
      </section>
    );
  }

  if (isLoggedIn && !isActive) {
    // No active subscription
    return (
      <section style={{ background: 'var(--agw-navy)', borderBottom: '3px solid var(--agw-gold)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            background: 'rgba(232,163,42,0.1)',
            border: '2px solid var(--agw-gold)',
            borderRadius: '4px',
            padding: '2rem',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: 'var(--agw-cream)',
              marginBottom: '0.75rem',
            }}>No Active Subscription</h2>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              color: 'var(--agw-steel)',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>Choose a plan to start processing your images at 300 DPI.</p>
            <a href="/pricing" style={{
              fontFamily: 'var(--font-sub)',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--agw-red)',
              background: 'var(--agw-cream)',
              padding: '0.85rem 2rem',
              textDecoration: 'none',
              borderRadius: '2px',
              border: '2px solid var(--agw-cream)',
              display: 'inline-block',
            }}>View Plans →</a>
          </div>
        </div>
      </section>
    );
  }

  // Not logged in
  return (
    <section style={{ background: 'var(--agw-navy)', borderBottom: '3px solid var(--agw-gold)', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(232,163,42,0.1)',
          border: '2px solid var(--agw-gold)',
          borderRadius: '4px',
          padding: '2rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            color: 'var(--agw-cream)',
            marginBottom: '0.75rem',
          }}>Ready to Process?</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: 'var(--agw-steel)',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
          }}>Sign in to upload your artwork, or create a new account to start for free.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth/login" style={{
              fontFamily: 'var(--font-sub)',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--agw-red)',
              background: 'var(--agw-cream)',
              padding: '0.85rem 2rem',
              textDecoration: 'none',
              borderRadius: '2px',
              border: '2px solid var(--agw-cream)',
              display: 'inline-block',
            }}>Sign In</a>
            <a href="/auth/register" style={{
              fontFamily: 'var(--font-sub)',
              fontWeight: 600,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--agw-cream)',
              background: 'transparent',
              padding: '0.85rem 2rem',
              textDecoration: 'none',
              borderRadius: '2px',
              border: '2px solid rgba(245,233,200,0.5)',
              display: 'inline-block',
            }}>Create Account →</a>
          </div>
        </div>
      </div>
    </section>
  );
}
