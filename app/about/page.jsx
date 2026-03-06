export const metadata = {
  title: 'About — All Good Web',
  description: 'All Good Web builds self-service tools for creative sellers. Here\'s the story behind the robot.',
};

export default function AboutPage() {
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
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-gold)', display: 'block', marginBottom: '1rem' }}>
              ★ The Story ★
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              color: 'var(--agw-cream)',
              lineHeight: 1.05,
              marginBottom: '1.5rem',
            }}>About All<br /><span style={{ color: 'var(--agw-gold)' }}>Good Web</span></h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              color: 'rgba(245,233,200,0.8)',
              lineHeight: 1.75,
              maxWidth: '480px',
            }}>
              Tools built for the people doing the actual work — Etsy sellers,
              digital creators, and small shop owners who deserve software that
              just works.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{
              width: 'clamp(120px, 15vw, 200px)',
              height: 'clamp(120px, 15vw, 200px)',
              borderRadius: '50%',
              border: '3px solid var(--agw-gold)',
              overflow: 'hidden',
            }}>
              <img
                src="/allgoodweb-logo.jpg"
                alt="All Good Web mascot"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Story content */}
      <section style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--agw-navy)', opacity: 0.2 }} />
            <span style={{ color: 'var(--agw-gold)', fontSize: '1rem', letterSpacing: '0.3rem' }}>✦ ✦ ✦</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--agw-navy)', opacity: 0.2 }} />
          </div>

          <article style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

            <div>
              <h2 style={sectionHeadStyle}>The Problem We Kept Running Into</h2>
              <p style={bodyStyle}>
                If you sell digital printables on Etsy, you know the drill: every listing needs
                every size. A single wall art design might need 4×6, 5×7, 8×10, A4, 16×20, 24×36 —
                and each one has to be cropped correctly, exported at 300 DPI, and named clearly so
                buyers know what they&apos;re downloading.
              </p>
              <p style={bodyStyle}>
                Manually doing this in Photoshop or Canva for every design eats hours you could
                spend actually creating. We got tired of it. So we built PrintPrep.
              </p>
            </div>

            <div style={dividerStyle} />

            <div>
              <h2 style={sectionHeadStyle}>Who We Are</h2>
              <p style={bodyStyle}>
                All Good Web is a small independent software studio. We build self-service tools
                for creative people running small businesses online — tools that are fast, focused,
                and fair-priced. No bloat, no enterprise tiers you don&apos;t need.
              </p>
              <p style={bodyStyle}>
                We&apos;re a lean team. We use our own tools. When something breaks or feels
                wrong, we feel it too. That keeps us honest.
              </p>
            </div>

            <div style={dividerStyle} />

            <div>
              <h2 style={sectionHeadStyle}>The Robot</h2>
              <p style={bodyStyle}>
                The mascot is a nod to the golden age of optimism about technology — the 1950s and
                60s, when robots were friendly, the future was bright, and machines were going to
                make life easier for everyone. That&apos;s still what we believe software should do.
                Not replace your judgment, not sell your data — just handle the tedious parts so
                you can do the good work.
              </p>
              <p style={bodyStyle}>
                He wears a bow tie because he takes the job seriously.
              </p>
            </div>

            <div style={dividerStyle} />

            <div>
              <h2 style={sectionHeadStyle}>What&apos;s Next</h2>
              <p style={bodyStyle}>
                PrintPrep is our first tool. The image converter came shortly after. More are
                in the works — all focused on the specific, repetitive tasks that eat time for
                creative sellers. If you have a workflow that drives you crazy, we&apos;d love
                to hear about it.
              </p>
              <div style={{ marginTop: '1.75rem' }}>
                <a href="/contact" style={{
                  fontFamily: 'var(--font-sub)', fontWeight: 700,
                  fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--agw-cream)', background: 'var(--agw-navy)',
                  padding: '0.8rem 2rem', textDecoration: 'none', borderRadius: '2px',
                  border: '2px solid var(--agw-navy)', display: 'inline-block',
                }}>Get in Touch →</a>
              </div>
            </div>

          </article>

          {/* Ornament */}
          <div style={{ textAlign: 'center', marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid rgba(15,32,39,0.12)' }}>
            <span style={{ color: 'var(--agw-gold)', fontSize: '1.2rem', letterSpacing: '0.5rem' }}>✦ ✦ ✦</span>
          </div>
        </div>
      </section>

    </div>
  );
}

const sectionHeadStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.75rem',
  color: 'var(--agw-navy)',
  marginBottom: '1rem',
  lineHeight: 1.1,
};

const bodyStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: '1.05rem',
  color: '#444',
  lineHeight: 1.8,
  marginBottom: '1rem',
};

const dividerStyle = {
  height: '1px',
  background: 'var(--agw-navy)',
  opacity: 0.12,
};
