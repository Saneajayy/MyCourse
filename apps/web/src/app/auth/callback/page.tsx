'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/auth-context';
import { setAccessToken } from '../../../lib/api-client';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (!token) {
      setError('Missing authentication token. Please try signing in again.');
      return;
    }

    let isMounted = true;

    async function completeAuth() {
      try {
        setAccessToken(token!);
        const currentUser = await refreshUser();

        if (!isMounted) return;

        if (currentUser?.role === 'ADMIN') {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Google auth callback completion error:', err);
        setError(err?.message || 'Failed to complete sign-in with Google. Please try again.');
      }
    }

    completeAuth();

    return () => {
      isMounted = false;
    };
  }, [searchParams, router, refreshUser]);

  if (error) {
    return (
      <div className="w-full max-w-md p-6 bg-[#16171a] border border-white/10 rounded-2xl shadow-2xl text-center space-y-4 font-reddit">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Authentication Failed</h2>
          <p className="text-xs text-[#c2c4cc] leading-relaxed max-w-sm mx-auto">{error}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#337df6] hover:bg-[#2b6ad0] text-white text-xs font-semibold transition-colors cursor-pointer w-full"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Sign In</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-[#16171a] border border-white/10 rounded-2xl shadow-2xl text-center space-y-4 font-reddit">
      <div className="w-12 h-12 rounded-full bg-[#337df6]/10 border border-[#337df6]/20 text-[#337df6] flex items-center justify-center mx-auto">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Completing Sign-In with Google
        </h2>
        <p className="text-xs text-[#c2c4cc] leading-relaxed">
          Setting up your secure session and learning workspace...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 bg-[#16171a] border border-white/10 rounded-2xl shadow-2xl text-center space-y-4 font-reddit">
            <div className="w-12 h-12 rounded-full bg-[#337df6]/10 border border-[#337df6]/20 text-[#337df6] flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-xs text-[#c2c4cc]">Loading...</p>
          </div>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}
