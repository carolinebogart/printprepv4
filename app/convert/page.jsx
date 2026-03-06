import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConvertTool from '@/components/ConvertTool';

export const metadata = {
  title: 'Image Converter — All Good Web',
  description: 'Free image format conversion. JPG, PNG, TIFF, WebP, GIF, and PDF. No credits required.',
};

export default async function ConvertPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/convert');
  }

  return (
    <div style={{ background: 'var(--agw-cream)', minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{
        background: 'var(--agw-navy)',
        padding: '3rem 1.5rem 3.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(122,158,181,0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--agw-steel)', display: 'block', marginBottom: '0.75rem',
          }}>★ Free Tool · No Credits Required ★</span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            color: 'var(--agw-cream)',
            lineHeight: 1.05,
            marginBottom: '0.75rem',
          }}>Image Converter</h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            color: 'rgba(245,233,200,0.75)',
            lineHeight: 1.7,
            maxWidth: '520px',
          }}>
            Convert images between formats — JPG, PNG, TIFF, WebP, GIF, and PDF.
            Free for all users, no credits consumed.
          </p>
        </div>
      </div>

      {/* Tool */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <ConvertTool />
      </div>
    </div>
  );
}
