export const metadata = {
  title: 'PrintPrep — Resize Artwork for Every Print Format',
  description: 'Upload once, get every print size at 300 DPI. Built for Etsy digital printable sellers. 2:3, 3:4, 4:5, 8:11, A-Series and more.',
};

const ratios = [
  { ratio: '2:3', sizes: '4×6 · 8×12 · 12×18 · 16×24 · 20×30 · 24×36' },
  { ratio: '3:4', sizes: '6×8 · 9×12 · 12×16 · 18×24' },
  { ratio: '4:5', sizes: '8×10 · 16×20 · 24×30' },
  { ratio: '8:11', sizes: '8×11 · 16×22' },
  { ratio: 'A-Series', sizes: 'A5 · A4 · A3 · A2 · A1' },
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

export default function PrintPrepPage() {
  return (
    <div style={{ background: 'var(--agw-cream)', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{
        background: 'var(--agw-navy)',
        padding: '5rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(232,163,42,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--agw-gold)', display: 'block', marginBottom: '1rem',
          }}>★ Tool 01 · Paid from $29/mo ★</span>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            color: 'var(--agw-cream)',
            lineHeight: 1.05,
            marginBottom: '1.25rem',
          }}>PrintPrep</h1>

          <p style={{
            fontFamily: 'var(--font-sub)',
            fontWeight: 600, fontSize: '1.1rem',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--agw-gold)',
            marginBottom: '1.5rem',
          }}>Resize Your Art for Every Print Format</p>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.1rem', lineHeight: 1.75,
            color: 'rgba(245,233,200,0.8)',
            maxWidth: '580px', margin: '0 auto 2.5rem',
          }}>
            Upload one high-resolution image. Get every standard print size — 2:3, 3:4, 4:5,
            8:11, and A-Series — all at 300 DPI, ready for print. Built for Etsy digital
            printable sellers who need every size in their listings.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth/register" style={{
              fontFamily: 'var(--font-sub)', fontWeight: 700,
              fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--agw-cream)', background: 'var(--agw-red)',
              padding: '0.9rem 2.5rem', textDecoration: 'none', borderRadius: '2px',
              border: '2px solid var(--agw-red)',
            }}>Start Free →</a>
            <a href="/pricing" style={{
              fontFamily: 'var(--font-sub)', fontWeight: 600,
              fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--agw-cream)', background: 'transparent',
              padding: '0.9rem 2.5rem', textDecoration: 'none', borderRadius: '2px',
              border: '2px solid rgba(245,233,200,0.35)',
            }}>See Pricing</a>
          </div>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--agw-steel)', marginTop: '1.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            1 credit = 1 image · All selected sizes included
          </p>
        </div>
      </section>

      {/* Ratios + sizes */}
      <section style={{ background: 'var(--agw-cream)', padding: '5rem 1.5rem', borderBottom: '4px solid var(--agw-navy)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-red)', display: 'block', marginBottom: '0.4rem' }}>What You Get</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'var(--agw-navy)', lineHeight: 1.1 }}>
              Every Ratio. Every Size.
            </h2>
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
            Portrait and landscape orientations available for each ratio
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
