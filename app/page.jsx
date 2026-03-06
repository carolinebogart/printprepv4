'use client';
import { useEffect, useRef } from 'react';

export default function HomePage() {
  return (
    <div style={{ background: 'var(--agw-cream)', minHeight: '100vh' }}>
      <Hero />
      <ProductsSection />
      <HowItWorksSection />
      <BlogTeaser />
      <CTABanner />
    </div>
  );
}

/* ─── HERO ─────────────────────────────────────────────────────── */
function Hero() {
  const robotRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!robotRef.current) return;
      const rect = robotRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      const maxShift = 6;
      const eyes = robotRef.current.querySelectorAll('.robot-pupil');
      eyes.forEach((eye) => {
        eye.style.transform = `translate(${dx * maxShift}px, ${dy * maxShift}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section style={{
      background: 'var(--agw-navy)',
      position: 'relative',
      overflow: 'hidden',
      padding: '5rem 1.5rem 4rem',
    }}>
      {/* Halftone dot texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(232,163,42,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        zIndex: 0,
      }} />

      {/* Scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
        zIndex: 1,
      }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center' }}>

          {/* Left: copy */}
          <div>
            {/* Eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--agw-red)', color: 'var(--agw-cream)',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '0.3rem 0.75rem', borderRadius: '1px', marginBottom: '1.5rem',
            }}>
              ★ Tools for Creative Sellers ★
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
              lineHeight: 1.05,
              color: 'var(--agw-cream)',
              marginBottom: '0.5rem',
              letterSpacing: '-0.01em',
            }}>
              ALL GOOD<br />
              <span style={{ color: 'var(--agw-gold)' }}>WEB</span>
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, height: '2px', background: 'var(--agw-gold)', opacity: 0.4 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--agw-steel)', letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Est. 2025</span>
              <div style={{ flex: 1, height: '2px', background: 'var(--agw-gold)', opacity: 0.4 }} />
            </div>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--agw-cream)',
              opacity: 0.8,
              lineHeight: 1.7,
              maxWidth: '480px',
              marginBottom: '2.5rem',
            }}>
              Self-service tools built for Etsy sellers, printable creators,
              and digital artists. Upload once. Download everything you need.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="/printprep" style={heroCTAStyle}>
                Try PrintPrep Free →
              </a>
              <a href="/convert" style={heroSecondaryStyle}>
                Free Image Converter
              </a>
            </div>

            {/* Social proof strip */}
            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { num: '20+', label: 'Output Sizes' },
                { num: '300', label: 'DPI Always' },
                { num: '400MB', label: 'Max Upload' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--agw-gold)', lineHeight: 1 }}>{num}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--agw-steel)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.2rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: robot mascot */}
          <div ref={robotRef} style={{ position: 'relative', flexShrink: 0 }}>
            {/* Starburst behind logo */}
            <div style={{
              position: 'absolute', inset: '-40px',
              background: 'radial-gradient(circle, rgba(232,163,42,0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              zIndex: 0,
            }} />
            <div style={{
              position: 'relative', zIndex: 1,
              width: 'clamp(200px, 22vw, 320px)',
              height: 'clamp(200px, 22vw, 320px)',
              borderRadius: '50%',
              border: '3px solid var(--agw-gold)',
              overflow: 'visible',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src="/allgoodweb-logo.jpg"
                alt="All Good Web robot mascot"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
              {/* Invisible overlays to track pupils — the img handles visual, JS tracks movement */}
              <span className="robot-pupil" style={{ display: 'none' }} />
              <span className="robot-pupil" style={{ display: 'none' }} />
            </div>

            {/* Orbiting badge */}
            <div style={{
              position: 'absolute', top: '-12px', right: '-12px',
              background: 'var(--agw-red)',
              color: 'var(--agw-cream)',
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.4rem 0.6rem', borderRadius: '50%',
              width: '68px', height: '68px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', lineHeight: 1.3,
              border: '2px solid var(--agw-gold)',
              zIndex: 2,
            }}>
              Free<br />Tools!
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const heroCTAStyle = {
  fontFamily: 'var(--font-sub)',
  fontWeight: 700,
  fontSize: '0.9rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--agw-cream)',
  background: 'var(--agw-red)',
  padding: '0.85rem 2rem',
  textDecoration: 'none',
  borderRadius: '2px',
  border: '2px solid var(--agw-red)',
  display: 'inline-block',
  transition: 'transform 0.1s, box-shadow 0.1s',
};

const heroSecondaryStyle = {
  fontFamily: 'var(--font-sub)',
  fontWeight: 600,
  fontSize: '0.9rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--agw-cream)',
  background: 'transparent',
  padding: '0.85rem 2rem',
  textDecoration: 'none',
  borderRadius: '2px',
  border: '2px solid rgba(245,233,200,0.35)',
  display: 'inline-block',
};

/* ─── PRODUCTS SECTION ──────────────────────────────────────────── */
function ProductsSection() {
  return (
    <section style={{ background: 'var(--agw-cream)', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3.5rem' }}>
          <div style={{ flex: 1, height: '2px', background: 'var(--agw-navy)', opacity: 0.15 }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'var(--agw-red)', display: 'block', marginBottom: '0.4rem',
            }}>The Toolkit</span>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              color: 'var(--agw-navy)',
              lineHeight: 1.1,
            }}>Our Tools</h2>
          </div>
          <div style={{ flex: 1, height: '2px', background: 'var(--agw-navy)', opacity: 0.15 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
          <ProductCard
            badge="Paid · From $29/mo"
            badgeColor="var(--agw-red)"
            number="01"
            name="PrintPrep"
            tagline="Resize Your Art for Every Print Format"
            description="Upload one high-res image and get every standard print size at 300 DPI — 2:3, 3:4, 4:5, 8:11, and A-Series. Perfect for Etsy digital printable sellers."
            features={['20+ output sizes per upload', '300 DPI with proper metadata', 'Custom background + transparent PNG', 'ZIP download of all sizes']}
            cta="Try PrintPrep →"
            ctaHref="/printprep"
            accent="var(--agw-red)"
          />
          <ProductCard
            badge="Free Tool"
            badgeColor="var(--agw-steel)"
            number="02"
            name="Image Converter"
            tagline="Convert Between Any Image Format"
            description="Free, instant image format conversion. JPG, PNG, WEBP, TIFF, BMP — convert anything to anything, right in your browser. No account required."
            features={['JPG · PNG · WEBP · TIFF · BMP', 'Instant conversion', 'No sign-up needed', 'Batch convert multiple files']}
            cta="Convert an Image →"
            ctaHref="/convert"
            accent="var(--agw-steel)"
          />
        </div>
      </div>
    </section>
  );
}

function ProductCard({ badge, badgeColor, number, name, tagline, description, features, cta, ctaHref, accent }) {
  return (
    <div style={{
      background: 'white',
      border: `2px solid var(--agw-navy)`,
      borderRadius: '4px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Top accent bar */}
      <div style={{ height: '4px', background: accent }} />

      <div style={{ padding: '2rem' }}>
        {/* Number + badge row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3.5rem',
            lineHeight: 1,
            color: 'var(--agw-navy)',
            opacity: 0.08,
          }}>{number}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'white', background: badgeColor,
            padding: '0.25rem 0.6rem', borderRadius: '1px',
          }}>{badge}</span>
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          color: 'var(--agw-navy)',
          marginBottom: '0.4rem',
          lineHeight: 1.1,
        }}>{name}</h3>

        <p style={{
          fontFamily: 'var(--font-sub)',
          fontWeight: 600,
          fontSize: '0.85rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: '1rem',
        }}>{tagline}</p>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem',
          lineHeight: 1.7,
          color: '#444',
          marginBottom: '1.5rem',
        }}>{description}</p>

        {/* Features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {features.map((f) => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ color: accent, fontWeight: 700, flexShrink: 0 }}>✦</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: '#555' }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a href={ctaHref} style={{
          display: 'inline-block',
          fontFamily: 'var(--font-sub)',
          fontWeight: 700,
          fontSize: '0.8rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'white',
          background: accent,
          padding: '0.7rem 1.5rem',
          textDecoration: 'none',
          borderRadius: '2px',
          border: `2px solid ${accent}`,
        }}>{cta}</a>
      </div>
    </div>
  );
}

/* ─── HOW IT WORKS ──────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'Upload', body: 'Drop your high-resolution artwork — up to 400MB. JPG, PNG, TIFF, WEBP all welcome.' },
    { n: '02', title: 'Crop', body: 'Adjust the crop for each print ratio. The image moves; the crop box stays fixed. You see exactly what gets printed.' },
    { n: '03', title: 'Generate', body: 'We output every selected size at 300 DPI using Lanczos3 resampling — professional quality, every time.' },
    { n: '04', title: 'Download', body: 'Download individual files or grab a single ZIP bundle of every size. Done.' },
  ];

  return (
    <section style={{ background: 'var(--agw-dark)', padding: '5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Halftone */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(245,233,200,0.04) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-gold)', display: 'block', marginBottom: '0.5rem' }}>
            The Process
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: 'var(--agw-cream)', lineHeight: 1.1 }}>
            Four Steps to Print-Ready
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0' }}>
          {steps.map(({ n, title, body }, i) => (
            <div key={n} style={{
              padding: '2.5rem 2rem',
              borderRight: i < steps.length - 1 ? '1px solid rgba(245,233,200,0.1)' : 'none',
              position: 'relative',
            }}>
              {/* Large faded number */}
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '5rem',
                lineHeight: 1,
                color: 'var(--agw-gold)',
                opacity: 0.12,
                position: 'absolute',
                top: '1.5rem', right: '1.5rem',
              }}>{n}</div>

              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'var(--agw-red)', marginBottom: '0.75rem',
              }}>Step {n}</div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                color: 'var(--agw-cream)',
                marginBottom: '0.75rem',
                lineHeight: 1.1,
              }}>{title}</h3>

              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                color: 'var(--agw-steel)',
              }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── BLOG TEASER ───────────────────────────────────────────────── */
function BlogTeaser() {
  const posts = [
    {
      category: 'Tips',
      title: 'Why 300 DPI Actually Matters for Etsy Print Sellers',
      excerpt: 'Your customers are counting on print quality they can\'t preview. Here\'s how to make sure every file you sell is truly print-ready.',
      slug: 'why-300-dpi-matters',
      date: 'Jan 2026',
    },
    {
      category: 'Product',
      title: 'PrintPrep Now Supports A-Series (ISO) Paper Sizes',
      excerpt: 'International buyers can now get perfectly-sized A4, A3, and A2 downloads from a single upload. No manual resizing needed.',
      slug: 'a-series-support',
      date: 'Dec 2025',
    },
    {
      category: 'Tips',
      title: 'The Best Image Formats for Etsy Digital Downloads',
      excerpt: 'JPG, PNG, or PDF? A practical guide to which format to offer in your Etsy listings — and when each one matters.',
      slug: 'best-image-formats-etsy',
      date: 'Nov 2025',
    },
  ];

  return (
    <section style={{ background: 'var(--agw-cream)', padding: '5rem 1.5rem', borderTop: '4px solid var(--agw-navy)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-red)', display: 'block', marginBottom: '0.4rem' }}>
              From the Desk
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: 'var(--agw-navy)', lineHeight: 1.1 }}>
              Latest Posts
            </h2>
          </div>
          <a href="/blog" style={{
            fontFamily: 'var(--font-sub)', fontWeight: 600, fontSize: '0.75rem',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--agw-navy)', textDecoration: 'none',
            borderBottom: '2px solid var(--agw-gold)', paddingBottom: '2px',
          }}>View All Posts →</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {posts.map((post) => (
            <a key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
              <article style={{
                background: 'white',
                border: '2px solid var(--agw-navy)',
                borderRadius: '2px',
                padding: '1.75rem',
                height: '100%',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    background: post.category === 'Product' ? 'var(--agw-red)' : 'var(--agw-navy)',
                    color: 'var(--agw-cream)',
                    padding: '0.2rem 0.5rem', borderRadius: '1px',
                  }}>{post.category}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#999', letterSpacing: '0.08em' }}>{post.date}</span>
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-sub)', fontWeight: 700,
                  fontSize: '1.05rem', letterSpacing: '0.02em',
                  color: 'var(--agw-navy)', marginBottom: '0.75rem', lineHeight: 1.3,
                }}>{post.title}</h3>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                  color: '#666', lineHeight: 1.65,
                }}>{post.excerpt}</p>
              </article>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA BANNER ────────────────────────────────────────────────── */
function CTABanner() {
  return (
    <section style={{
      background: 'var(--agw-red)',
      padding: '4rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Starburst pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(245,233,200,0.06) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }} />

      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,233,200,0.7)', marginBottom: '1rem' }}>
          ✦ ✦ ✦
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 4rem)',
          color: 'var(--agw-cream)',
          lineHeight: 1.05,
          marginBottom: '1rem',
        }}>
          Ready to Save Hours<br />on Every Listing?
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.1rem',
          color: 'rgba(245,233,200,0.85)',
          marginBottom: '2.5rem',
          lineHeight: 1.65,
        }}>
          One credit. One image. Every size you need.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/auth/register" style={{
            fontFamily: 'var(--font-sub)', fontWeight: 700,
            fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--agw-red)',
            background: 'var(--agw-cream)',
            padding: '0.9rem 2.5rem',
            textDecoration: 'none', borderRadius: '2px',
            border: '2px solid var(--agw-cream)',
          }}>Start Free →</a>
          <a href="/pricing" style={{
            fontFamily: 'var(--font-sub)', fontWeight: 600,
            fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--agw-cream)',
            background: 'transparent',
            padding: '0.9rem 2.5rem',
            textDecoration: 'none', borderRadius: '2px',
            border: '2px solid rgba(245,233,200,0.5)',
          }}>View Pricing</a>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(245,233,200,0.5)', letterSpacing: '0.1em', marginTop: '1.5rem', textTransform: 'uppercase' }}>
          No commitment · Cancel anytime
        </p>
      </div>
    </section>
  );
}
