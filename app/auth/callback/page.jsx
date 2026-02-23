'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Verifying your email...');
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      // Extract tokens from URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setStatus('Verification failed. Please try logging in.');
          setTimeout(() => router.push('/auth/login'), 2000);
          return;
        }

        // Password recovery — redirect to reset-password page
        const tokenType = hashParams.get('type');
        if (tokenType === 'recovery') {
          setStatus('Redirecting to password reset...');
          setTimeout(() => {
            router.push('/auth/reset-password');
            router.refresh();
          }, 500);
          return;
        }

        // Check if subscription exists, create default if not
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (!existing) {
            await supabase.from('subscriptions').insert({
              user_id: user.id,
              plan_name: 'none',
              status: 'inactive',
              credits_total: 0,
              credits_used: 0,
            });
          }
        }

        setStatus('Email verified! Redirecting...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);
      } else {
        // Try code exchange (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus('Verification failed. Please try logging in.');
            setTimeout(() => router.push('/auth/login'), 2000);
            return;
          }

          setStatus('Email verified! Redirecting...');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1000);
        } else {
          setStatus('Invalid verification link. Please try again.');
          setTimeout(() => router.push('/auth/login'), 3000);
        }
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="bg-white p-8 rounded-xl border border-gray-200">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
