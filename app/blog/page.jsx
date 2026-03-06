import { posts } from './posts';

export const metadata = {
  title: 'Blog — All Good Web',
  description: 'Tips for Etsy digital printable sellers and product updates from All Good Web.',
};

export default function BlogPage() {
  const tips = posts.filter((p) => p.category === 'Tips');
  const product = posts.filter((p) => p.category === 'Product');

  return (
    <div style={{ background: 'var(--agw-cream)', minHeight: '100vh' }}>

      {/* Header */}
      <section style={{
        background: 'var(--agw-navy)',
        padding: '4rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(232,163,42,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-gold)', display: 'block', marginBottom: '0.75rem' }}>
            ★ From the Desk ★
          </span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            color: 'var(--agw-cream)',
            lineHeight: 1.05,
            marginBottom: '1rem',
          }}>The Blog</h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            color: 'rgba(245,233,200,0.75)',
            lineHeight: 1.7,
            maxWidth: '480px',
          }}>
            Tips for Etsy sellers, guides on print formats and file quality, and product updates
            from the All Good Web team.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem' }}>

        {product.length > 0 && (
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-red)', whiteSpace: 'nowrap' }}>
                Product Updates
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--agw-navy)', opacity: 0.15 }} />
            </div>
            <PostGrid posts={product} />
          </div>
        )}

        {tips.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--agw-navy)', whiteSpace: 'nowrap' }}>
                Seller Tips
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--agw-navy)', opacity: 0.15 }} />
            </div>
            <PostGrid posts={tips} />
          </div>
        )}

      </section>
    </div>
  );
}

function PostGrid({ posts: postList }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {postList.map((post) => (
        <a key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
          <article style={{
            background: 'white',
            border: '2px solid var(--agw-navy)',
            borderRadius: '2px',
            padding: '1.75rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                background: post.category === 'Product' ? 'var(--agw-red)' : 'var(--agw-navy)',
                color: 'var(--agw-cream)',
                padding: '0.2rem 0.5rem', borderRadius: '1px',
              }}>{post.category}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#999', letterSpacing: '0.06em' }}>{post.date}</span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-sub)', fontWeight: 700,
              fontSize: '1.05rem', letterSpacing: '0.02em',
              color: 'var(--agw-navy)', marginBottom: '0.75rem', lineHeight: 1.3,
              flex: '0 0 auto',
            }}>{post.title}</h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              color: '#666', lineHeight: 1.65, flex: 1,
            }}>{post.excerpt}</p>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              color: 'var(--agw-red)', letterSpacing: '0.08em', textTransform: 'uppercase',
              marginTop: '1.25rem',
            }}>Read More →</div>
          </article>
        </a>
      ))}
    </div>
  );
}
