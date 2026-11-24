'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useToast, ToastTab } from '../../components/ui';
import { siteConfig } from '../../config/site';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const { register } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleAuth = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsGoogleLoading(true);
    try {
      const res = await fetch(`${siteConfig.urls.api}/api/v1/auth/google`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.url) {
          window.location.href = json.data.url;
          return;
        }
      }
      window.location.href = `${siteConfig.urls.api}/api/v1/auth/google`;
    } catch {
      window.location.href = `${siteConfig.urls.api}/api/v1/auth/google`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 10) {
      setErrorMsg('Password must be at least 10 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password);
      toastSuccess('Account Registered', '6-digit verification code sent to your email.');
      const params = new URLSearchParams();
      params.set('email', email);
      if (redirectUrl) {
        params.set('redirect', redirectUrl);
      }
      router.push(`/verify-email?${params.toString()}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setErrorMsg(message);
      toastError('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Error Alert outside the card - floats softly above without shifting card position */}
      <ToastTab
        message={errorMsg}
        onDismiss={() => setErrorMsg(null)}
        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20"
      />

      <div className="relative w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-7 select-none overflow-hidden space-y-4 transition-all text-left">
      {/* Header */}
      <div className="space-y-1 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Create Your Student Account
        </h1>
        <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
          Start learning hydraulic engineering today
        </p>
      </div>

      {/* 1. Continue with Google Button */}
      <a
        href={`${siteConfig.urls.api}/api/v1/auth/google`}
        onClick={handleGoogleAuth}
        className="w-full h-11 rounded-lg border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] hover:bg-[#22242a] text-white font-medium text-xs sm:text-[13px] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#337df6]" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
        )}
        <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
      </a>

      {/* 2. Visual "OR" Divider */}
      <div className="relative my-3 flex items-center justify-center">
        <div className="w-full border-t border-white/[0.08]" />
        <span className="absolute bg-[#151619] px-2 text-[10px] font-mono uppercase tracking-wider text-[#80828d]">
          OR
        </span>
      </div>

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="register-name" className="text-xs font-medium text-white block">
            Full Name
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Ramesh Kumar"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 text-sm text-white placeholder:text-neutral-500 rounded-lg outline-none transition-colors"
          />
        </div>

        {/* Email Address */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="register-email" className="text-xs font-medium text-white block">
            Email Address
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="engineer@plant.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 px-3 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 text-sm text-white placeholder:text-neutral-500 rounded-lg outline-none transition-colors"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="register-password" className="text-xs font-medium text-white block">
            Password (min 10 chars)
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••••"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 pr-10 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 text-sm text-white placeholder:text-neutral-500 rounded-lg outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1 focus:outline-none"
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

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-black" aria-hidden="true" />
            )}
            <span>{isLoading ? 'Creating Account...' : 'Create Account \u2192'}</span>
          </button>
        </div>
      </form>

      {/* Already have an account? Sign in */}
      <div className="pt-1 text-center text-xs text-[#c2c4cc]">
        Already have an account?{' '}
        <Link
          href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
          className="font-semibold text-white underline hover:text-white/80 transition-colors ml-1"
        >
          Sign in &rarr;
        </Link>
      </div>

      {/* Horizontal Divider */}
      <div className="-mx-5 sm:-mx-7 border-t border-white/[0.06] pt-4" />

      {/* Footer Disclaimer */}
      <p className="text-center text-[11px] text-[#80828d] leading-normal">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-white transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-white transition-colors">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
    </div>
  );
}

export default function RegisterPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit selection:bg-white selection:text-black z-10 flex flex-col lg:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* LEFT CARD (Desktop Only): Signature Fractal Glass Graphic     */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
        {/* Full-Bleed Fractal Glass Graphic */}
        <Image
          src="/fractal-glass-5.jpg"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center select-none"
        />
        {/* Top Vignette Gradient Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Row over Image */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <Link href="/" className="flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Register Form                                      */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
          <Link
            href="/"
            className="lg:hidden flex flex-col select-none group"
            title="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              BASICS
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-[#c2c4cc]/70 hover:text-white transition-colors ml-auto"
            title="Back to Home"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Home</span>
          </Link>
        </div>

        {/* Thin Stroke Separation Line */}
        <div className="border-b border-white/[0.08] w-full shrink-0" />

        {/* Form Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 py-8 sm:px-6 sm:py-10 lg:p-8 flex flex-col items-center">
          <div className="w-full max-w-[420px] sm:max-w-[450px] space-y-4 my-auto">
            <Suspense
              fallback={
                <div className="p-8 text-center text-xs font-mono text-[#c2c4cc]">
                  Loading registration...
                </div>
              }
            >
              <RegisterForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
