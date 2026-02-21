import { updateSession } from './lib/supabase/middleware';
import { NextResponse } from 'next/server';

const protectedRoutes = ['/account', '/history', '/crop', '/download'];
const adminRoutes = ['/admin'];

export async function middleware(request) {
  const { user, supabaseResponse } = await updateSession(request);

  const path = request.nextUrl.pathname;

  // Check if route needs authentication
  const isProtected = protectedRoutes.some((r) => path.startsWith(r));
  const isAdmin = adminRoutes.some((r) => path.startsWith(r));

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', path);
      return NextResponse.redirect(loginUrl);
    }

    // Admin role check — query admin_users table via Supabase
    // We can't do a DB query in edge middleware easily, so we'll
    // let the admin layout/page handle the role check and show 403.
    // Middleware only ensures the user is authenticated for admin routes.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
