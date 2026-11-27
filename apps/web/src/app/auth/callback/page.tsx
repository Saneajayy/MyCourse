'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/auth-context';
import { setAccessToken } from '../../../lib/api-client';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit select-none z-10 flex flex-col md:flex-row gap-2.5 sm:gap-3">
      {/* Left Sidebar Skeleton */}
      <aside className="w-full shrink-0 md:flex-none md:w-64 lg:w-72 md:h-full md:shrink-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden">
        <div>
          {/* Logo Header */}
          <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex flex-col select-none">
              <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase">
                HYDRO
              </span>
              <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase">
                BASICS
              </span>
            </div>
            <span className="text-[11px] font-mono tracking-wider text-[#c2c4cc]/70">Home</span>
          </div>

          <div className="border-b border-white/[0.08] w-full shrink-0" />

          {/* Navigation Items Skeleton */}
          <div className="p-2.5 space-y-1.5 animate-pulse">
            <div className="px-2.5 py-1 text-[9px] font-semibold tracking-widest text-[#7e828d] uppercase">
              MAIN
            </div>
            <div className="h-9 w-full bg-[#1f2023] rounded-lg flex items-center px-3 gap-2.5">
              <div className="w-3.5 h-3.5 bg-white/20 rounded" />
              <div className="h-3.5 w-20 bg-white/20 rounded" />
            </div>
            <div className="h-9 w-full bg-white/[0.03] rounded-lg flex items-center px-3 gap-2.5">
              <div className="w-3.5 h-3.5 bg-white/10 rounded" />
              <div className="h-3.5 w-24 bg-white/10 rounded" />
            </div>

            <div className="pt-2 px-2.5 py-1 text-[9px] font-semibold tracking-widest text-[#7e828d] uppercase">
              TOOLS
            </div>
            <div className="h-9 w-full bg-white/[0.03] rounded-lg flex items-center px-3 gap-2.5">
              <div className="w-3.5 h-3.5 bg-white/10 rounded" />
              <div className="h-3.5 w-28 bg-white/10 rounded" />
            </div>
            <div className="h-9 w-full bg-white/[0.03] rounded-lg flex items-center px-3 gap-2.5">
              <div className="w-3.5 h-3.5 bg-white/10 rounded" />
              <div className="h-3.5 w-20 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      </aside>

      {/* Right Workspace Skeleton */}
      <main className="w-full flex-1 min-h-0 md:h-full md:min-w-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8 md:px-9 md:pt-7 md:pb-9 space-y-6">
          {/* Greeting Header Skeleton */}
          <div className="space-y-2 animate-pulse">
            <div className="h-6 w-44 bg-white/10 rounded-md" />
            <div className="h-3.5 w-60 bg-white/5 rounded-md" />
          </div>

          {/* Course Card Skeleton matching modern layout */}
          <div className="w-full md:w-fit max-w-full bg-[#151619] border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start gap-5 lg:gap-6 animate-pulse">
            <div className="w-full aspect-square md:w-[135px] md:h-[135px] bg-white/10 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col justify-between py-0.5 space-y-4 min-w-[280px] sm:min-w-[340px]">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-white/15 rounded" />
                <div className="h-3.5 w-full max-w-md bg-white/5 rounded" />
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full max-w-xs bg-white/10 rounded-full" />
                <div className="flex items-center gap-3">
                  <div className="h-9 w-32 bg-white/15 rounded-lg" />
                  <div className="h-9 w-28 bg-white/5 rounded-lg border border-white/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Status Pill */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#16171a]/90 backdrop-blur-md border border-white/10 shadow-2xl select-none">
        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
        <span className="text-xs font-medium text-white tracking-wide">
          Signing in with Google...
        </span>
      </div>
    </div>
  );
}

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
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm z-50 font-reddit">
        <div className="w-full max-w-md p-6 bg-[#16171a] border border-white/10 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Authentication Failed</h2>
            <p className="text-xs text-[#c2c4cc] leading-relaxed max-w-sm mx-auto">{error}</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-colors cursor-pointer w-full"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return <DashboardSkeleton />;
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-black text-white relative">
      <Suspense fallback={<DashboardSkeleton />}>
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}
