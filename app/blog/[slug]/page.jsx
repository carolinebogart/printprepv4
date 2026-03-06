import { notFound } from 'next/navigation';
import { posts, getPost } from '../posts';

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — All Good Web Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Simple block renderer for headings + paragraphs + bullet lists
  const sections = post.body.split('\n\n');

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
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <a href="/blog" style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--agw-steel)', textDecoration: 'none',
            }}>← All Posts</a>
            <span style={{ color: 'rgba(245,233,200,0.2)' }}>|</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              background: post.category === 'Product' ? 'var(--agw-red)' : 'var(--agw-steel)',
              color: 'var(--agw-cream)', padding: '0.2rem 0.5rem', borderRadius: '1px',
            }}>{post.category}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--agw-steel)', letterSpacing: '0.06em' }}>{post.date}</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 4vw, 3.5rem)',
            color: 'var(--agw-cream)',
            lineHeight: 1.1,
          }}>{post.title}</h1>
        </div>
      </section>

      {/* Body */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sections.map((block, i) => {
            if (block.startsWith('## ')) {
              return (
                <h2 key={i} style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.6rem',
                  color: 'var(--agw-navy)',
                  lineHeight: 1.15,
                  marginTop: '1rem',
                  borderBottom: '2px solid var(--agw-gold)',
                  paddingBottom: '0.5rem',
                  display: 'inline-block',
                }}>{block.replace('## ', '')}</h2>
              );
            }
            // Handle blocks that are bullet lists (lines starting with "- ")
            if (block.trim().startsWith('- ')) {
              const items = block.split('\n').filter((l) => l.startsWith('- '));
              return (
                <ul key={i} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {items.map((item, j) => (
                    <li key={j} style={{ display: 'flex', gap: '0.6rem', fontFamily: 'var(--font-body)', fontSize: '1rem', color: '#444', lineHeight: 1.7 }}>
                      <span style={{ color: 'var(--agw-gold)', flexShrink: 0, marginTop: '0.25rem' }}>✦</span>
                      <span>{item.replace(/^- /, '').replace(/\*\*/g, '')}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            // Handle bold labels followed by list items on same block
            if (block.includes('\n- ')) {
              const lines = block.split('\n');
              const label = lines[0].replace(/\*\*/g, '');
              const items = lines.slice(1).filter((l) => l.startsWith('- '));
              return (
                <div key={i}>
                  <p style={{ fontFamily: 'var(--font-sub)', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--agw-navy)', marginBottom: '0.5rem' }}>
                    {label}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {items.map((item, j) => (
                      <li key={j} style={{ display: 'flex', gap: '0.6rem', fontFamily: 'var(--font-body)', fontSize: '1rem', color: '#444', lineHeight: 1.7 }}>
                        <span style={{ color: 'var(--agw-gold)', flexShrink: 0, marginTop: '0.25rem' }}>✦</span>
                        <span>{item.replace(/^- /, '').replace(/\*\*/g, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            return (
              <p key={i} style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.05rem',
                color: '#444',
                lineHeight: 1.8,
              }}>
                {block.replace(/\*\*/g, '')}
              </p>
            );
          })}
        </div>

        {/* Footer nav */}
        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(15,32,39,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <a href="/blog" style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--agw-navy)', textDecoration: 'none',
            borderBottom: '2px solid var(--agw-gold)', paddingBottom: '2px',
          }}>← All Posts</a>
          <a href="/printprep" style={{
            fontFamily: 'var(--font-sub)', fontWeight: 700,
            fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--agw-cream)', background: 'var(--agw-red)',
            padding: '0.6rem 1.5rem', textDecoration: 'none', borderRadius: '2px',
          }}>Try PrintPrep →</a>
        </div>
      </section>

    </div>
  );
}
