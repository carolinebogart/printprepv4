import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\.$/, '');
  return NextResponse.redirect(new URL('/', base));
}
