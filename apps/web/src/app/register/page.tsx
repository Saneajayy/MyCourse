'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useToast } from '../../components/ui';
import { siteConfig } from '../../config/site';
import { AlertCircle, Check, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRequestId(null);

    if (password.length < 10) {
      setErrorMsg('Password must be at least 10 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password);
      toastSuccess('Account Registered', '6-digit verification code sent to your email.');
      const dest = `/verify-email?email=${encodeURIComponent(email.trim())}${
        redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''
      }`;
      router.push(dest);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setErrorMsg(message);
      if (err && typeof err === 'object' && 'requestId' in err) {
        setRequestId((err as { requestId?: string }).requestId || null);
      }
      toastError('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full bg-white border border-neutral-200/90 rounded-2xl lg:bg-transparent lg:border-none lg:rounded-none p-5 sm:p-7 select-none">
          {/* SVG Deckled / Textured Edge Filter (Desktop Only) */}
          <svg className="hidden lg:block absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <defs>
              <filter
                id="figma-texture-register"
                x="-10%"
                y="-15%"
                width="120%"
                height="130%"
                filterUnits="objectBoundingBox"
                primitiveUnits="userSpaceOnUse"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.25"
                  numOctaves="3"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="5.1"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>

          {/* Textured White Card Background via SVG Filter (Desktop Only) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-visible">
            <svg
              className="w-full h-full overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                rx="5.1"
                ry="5.1"
                fill="white"
                filter="url(#figma-texture-register)"
              />
            </svg>
          </div>

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

                {/* Error Alert */}
                {errorMsg && (
                  <div className="mt-4 p-3.5 rounded-lg border border-rose-200 bg-rose-50/90 text-rose-950 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                    {requestId && (
                      <p className="font-mono text-[10px] text-rose-700/80 mt-1 pl-6">Ref ID: {requestId}</p>
                    )}
                  </div>
                )}

                {/* Register Form */}
                <form onSubmit={handleSubmit} className="mt-5 sm:mt-6 space-y-3.5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="register-name" className="text-sm font-bold text-neutral-900">
                      Full Name
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Smith Jones"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-[44px] sm:h-[46px] rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none focus:ring-1 focus:ring-[#0033FF] transition-all"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label htmlFor="register-email" className="text-sm font-bold text-neutral-900">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        placeholder="Engineer@gmail.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-[44px] sm:h-[46px] rounded-lg border border-neutral-300 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none focus:ring-1 focus:ring-[#0033FF] transition-all"
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
                    <label htmlFor="register-password" className="text-sm font-bold text-neutral-900">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 10 characters"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-[44px] sm:h-[46px] rounded-lg border border-neutral-300 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none focus:ring-1 focus:ring-[#0033FF] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors p-1 rounded-md focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Blue Submit Button */}
                  <div className="pt-1.5">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] active:scale-[0.99] text-white font-bold text-base rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
                      <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                    </button>
                  </div>
                </form>

                {/* Already have an account? Sign in */}
                <div className="mt-4 text-center text-sm text-neutral-600">
                  Already have an account?{' '}
                  <Link
                    href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                    className="font-bold text-[#0033FF] underline hover:text-[#0028D6] ml-1"
                  >
                    Sign in
                  </Link>
                </div>

                {/* Horizontal Divider */}
                <div className="-mx-5 sm:-mx-7 border-t border-neutral-200 my-4 sm:my-5" />

                {/* Footer Disclaimer */}
                <p className="text-center text-xs text-neutral-500 leading-normal">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="underline hover:text-neutral-800">
                    Terms &amp; policies
                  </Link>
                  .
                </p>
          </div>
        </div>
  );
}

export default function RegisterPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-white font-reddit selection:bg-[#0033FF] selection:text-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Column (Desktop Only): Signature Dot Halftone Graphic on Deep Cobalt Blue */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 h-full bg-[#00186B] overflow-hidden select-none">
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
          className="absolute inset-0 bg-gradient-to-t from-[#000c3b]/80 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right Column: White on Mobile, Royal Blue (#0033FF) on Desktop */}
      <div className="w-full lg:w-1/2 h-full bg-white lg:bg-[#0033FF] flex flex-col overflow-y-auto relative">
        {/* Top Header Bar (scrolls with the page) */}
        <header className="w-full flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8 shrink-0 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#0033FF] lg:text-white lg:hover:text-white/80 text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Course</span>
          </Link>

          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-[#0033FF] lg:text-white hover:opacity-90 transition-opacity select-none text-right"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </header>

        {/* Centered Register Card */}
        <div className="m-auto w-full max-w-[420px] sm:max-w-[450px] px-4 py-4 sm:py-6 relative z-10">
          <Suspense
            fallback={
              <div className="p-8 text-center text-sm font-mono text-neutral-500">
                Loading registration...
              </div>
            }
          >
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
