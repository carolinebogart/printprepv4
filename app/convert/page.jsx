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
      <div style={{ background: 'var(--agw-navy)', borderBottom: '2px solid var(--agw-gold)', padding: '0.9rem 1.5rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--agw-cream)', lineHeight: 1, margin: 0 }}>Image Converter</h1>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--agw-steel)' }}>Free · No credits required</span>
        </div>
      </div>

      {/* Tool */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <ConvertTool />
      </div>
    </div>
  );
}
