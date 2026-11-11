'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../components/ui';
import { siteConfig } from '../../config/site';
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/my-courses';

  const { login } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.requires2FA && result.tempToken) {
        toastSuccess('Password verified', 'Please enter your two-factor authentication code.');
        const targetRedirect = searchParams.get('redirect') || '/admin';
        router.push(
          `/admin/2fa?tempToken=${encodeURIComponent(result.tempToken)}&redirect=${encodeURIComponent(targetRedirect)}`,
        );
        return;
      }

      const explicitRedirect = searchParams.get('redirect');

      // Admin users MUST ALWAYS be redirected directly to Admin Panel, never to student pages
      if (result.user?.role === 'ADMIN') {
        const adminDest = explicitRedirect && explicitRedirect.startsWith('/admin')
          ? explicitRedirect
          : '/admin';
        toastSuccess('Welcome Admin', 'Redirecting to Admin Console...');
        router.push(adminDest);
        return;
      }

      if (explicitRedirect) {
        toastSuccess('Welcome back!', 'Successfully logged in.');
        router.push(explicitRedirect);
      } else {
        toastSuccess('Welcome back!', 'Successfully logged in to your account.');
        router.push('/my-courses');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      setErrorMsg(message);
      toastError('Login Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const [showRemindHint, setShowRemindHint] = useState(false);

  return (
    <div className="relative w-full bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl p-5 sm:p-8 select-none overflow-hidden">
      {/* Card Content */}
      <div className="relative z-10 w-full">
        {/* 1. Continue with Google Button */}
        <a
          href={`${siteConfig.urls.api}/api/v1/auth/google`}
          className="w-full h-[46px] sm:h-[48px] rounded-lg border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-900 font-semibold text-sm sm:text-[15px] flex items-center justify-center gap-3 transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </a>

        {/* Success Notification Alert */}
        {searchParams.get('message') === 'password-changed' && !errorMsg && (
          <div className="mt-4 p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/95 text-emerald-950 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>Password updated successfully. Please sign in with your new password.</span>
            </div>
          </div>
        )}

        {/* Session Expired Alert */}
        {searchParams.get('message') === 'session-expired' && !errorMsg && (
          <div className="mt-4 p-3.5 rounded-lg border border-amber-300 bg-amber-50/95 text-amber-950 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Your session has expired. Please sign in again to continue.</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-700 text-xs sm:text-[13px] font-medium text-center">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 sm:mt-7 space-y-4 sm:space-y-5">
          {/* Username or Email */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-email" className="text-sm font-bold text-neutral-900">
                Username or Email
              </label>
              <button
                type="button"
                onClick={() => setShowRemindHint((prev) => !prev)}
                className="text-sm text-neutral-600 underline hover:text-black cursor-pointer"
              >
                Remind me
              </button>
            </div>
            {showRemindHint && (
              <p className="text-xs text-neutral-600 bg-neutral-100 p-2 rounded-md">
                Your username is the registered email you used during enrollment.
              </p>
            )}
            <div className="relative">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="Username or Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[44px] sm:h-[46px] rounded-lg border border-neutral-300 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
              />
              {email.includes('@') && email.length > 4 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-bold text-neutral-900">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-neutral-600 underline hover:text-black"
              >
                Forgot
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[44px] sm:h-[46px] rounded-lg border border-neutral-300 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors p-1 rounded-md focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Blue Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] sm:h-[48px] bg-black hover:bg-[#262626] active:bg-[#171717] active:scale-[0.99] text-white font-bold text-base rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
              <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </div>
        </form>

        {/* New here? Create an account */}
        <div className="mt-5 text-center text-sm text-neutral-600">
          New here?{' '}
          <Link
            href={redirectUrl ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
            className="font-bold text-black underline hover:text-[#262626] ml-1"
          >
            Create an account
          </Link>
        </div>

        {/* Horizontal Divider */}
        <div className="-mx-5 sm:-mx-8 border-t border-neutral-200 my-6" />

        {/* Footer Disclaimer */}
        <p className="text-center text-xs text-neutral-500 leading-normal">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-neutral-800">
            Terms &amp; policies
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-white font-reddit selection:bg-black selection:text-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Column (Desktop Only): Signature Dot Halftone Graphic on Deep Cobalt Blue */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 h-full bg-black overflow-hidden select-none">
        <Image
          src="/login-pixelated.png"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center mix-blend-screen opacity-95 select-none"
        />
        {/* Soft overlay gradient for subtle depth */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#000000]/80 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right Column: Clean White Background */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col overflow-y-auto relative">
        {/* Top Header Bar inside the right side login area */}
        <header className="w-full flex items-center justify-end px-5 pt-5 sm:px-8 sm:pt-8 shrink-0 z-20">
          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-black hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
            aria-label="HYDRO BASICS Home - Back to Course"
          >
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </header>

        {/* Perfectly Centered Login Card */}
        <div className="m-auto w-full max-w-[420px] sm:max-w-[440px] px-4 py-6 sm:py-8 relative z-10">
          <Suspense
            fallback={
              <div className="p-8 text-center text-sm font-mono text-neutral-500">
                Loading login...
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
