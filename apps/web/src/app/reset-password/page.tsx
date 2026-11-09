'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const { error: toastError, success: toastSuccess } = useToast();

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 10) {
      setErrorMsg('Password must be at least 10 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
        }),
        skipAuth: true,
      });

      setIsSuccess(true);
      toastSuccess(
        'Password Updated',
        'Your password was successfully updated. You may now log in.',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset token';
      setErrorMsg(msg);
      toastError('Reset Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[430px] sm:max-w-[460px] p-6 sm:p-8 md:p-9 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)]">
      {/* SVG Deckled / Torn Paper Textured Edge Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter
            id="figma-texture-reset"
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
              scale="5.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Textured White Card Background via SVG Filter */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
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
            filter="url(#figma-texture-reset)"
          />
        </svg>
      </div>

      {/* Card Content */}
      <div className="relative z-10 w-full">
        {isSuccess ? (
          <div className="text-center py-4 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Password Reset Successful
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
              Your password has been securely updated. You can now log in with your new credentials.
            </p>
            <div className="pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-base rounded-md sm:rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header & Title */}
            <div className="text-center mb-5">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Set New Password
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                Enter your reset token and your new strong password
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-lg border border-rose-200 bg-rose-50/90 text-rose-950 text-xs shadow-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Token */}
              <div className="space-y-1 text-left">
                <label htmlFor="reset-token" className="text-sm font-bold text-neutral-900">
                  Reset Security Token
                </label>
                <input
                  id="reset-token"
                  type="text"
                  placeholder="Paste token from your email"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full h-[42px] sm:h-[44px] rounded-md sm:rounded-lg border border-neutral-400 bg-white px-3.5 text-sm text-neutral-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all font-mono"
                />
              </div>

              {/* New Password */}
              <div className="space-y-1 text-left">
                <label htmlFor="reset-password" className="text-sm font-bold text-neutral-900">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 10 characters"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-[42px] sm:h-[44px] rounded-md sm:rounded-lg border border-neutral-400 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors p-1 rounded-md focus:outline-none"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1 text-left">
                <label htmlFor="reset-confirm-password" className="text-sm font-bold text-neutral-900">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-[42px] sm:h-[44px] rounded-md sm:rounded-lg border border-neutral-400 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors p-1 rounded-md focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] active:scale-[0.99] text-white font-bold text-base rounded-md sm:rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer border border-[#0033FF]/50"
                >
                  {isLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
                  <span>{isLoading ? 'Updating Password...' : 'Reset Password'}</span>
                </button>
              </div>
            </form>

            {/* Back to Login */}
            <div className="mt-4 text-center text-sm text-neutral-700">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-bold text-neutral-900 underline hover:text-black ml-1"
              >
                Sign in
              </Link>
            </div>

            {/* Horizontal Divider */}
            <div className="w-full border-t border-neutral-200 my-5" />

            {/* Footer Disclaimer */}
            <p className="text-center text-xs text-neutral-500 leading-normal">
              Need assistance? Contact our{' '}
              <Link href="/contact" className="underline hover:text-neutral-800">
                support desk
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0033FF] font-reddit selection:bg-white selection:text-[#0033FF] overflow-x-hidden">
      {/* Desktop Floating Escape / Back Navigation */}
      <Link
        href="/login"
        className="hidden lg:inline-block absolute top-6 right-8 z-30 text-white hover:text-white/80 text-sm font-semibold underline-offset-4 hover:underline transition-colors"
      >
        Back to Login
      </Link>

      {/* Top Banner (20% length on mobile, 50% left column on desktop): Hero Halftone Photo with "HYDRO BASICS" */}
      <div className="relative w-full lg:w-1/2 h-[20vh] min-h-[130px] sm:h-[22vh] sm:min-h-[160px] lg:h-auto lg:min-h-screen bg-[#0033FF] overflow-hidden flex flex-col justify-end">
        {/* All-White Halftone Dot Graphic (permanent, no flash or WebGL fade transition) */}
        <Image
          src="/login-pixelated.png"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center select-none"
        />

        {/* Soft Depth Gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#001040]/70 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Signature Bold Brand Header: HYDRO BASICS */}
        <div className="relative z-20 p-3.5 sm:p-6 lg:p-16 select-none pointer-events-none">
          <div className="font-extrabold text-white uppercase tracking-tight leading-[0.84] text-2xl sm:text-4xl md:text-6xl lg:text-[76px] xl:text-[88px] drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
            <span className="block">HYDRO</span>
            <span className="block">BASICS</span>
          </div>
        </div>

        {/* Mobile Back to Login: Bottom Right of the image with high-contrast gradient backdrop */}
        <Link
          href="/login"
          className="lg:hidden absolute bottom-3 right-3.5 sm:bottom-4 sm:right-6 z-30 text-white/95 hover:text-white text-xs sm:text-sm font-semibold underline-offset-4 hover:underline transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
        >
          Back to Login
        </Link>
      </div>

      {/* Right Column: Royal Blue Canvas with Centered Deckled White Card (80% on mobile) */}
      <div className="relative w-full lg:w-1/2 flex-1 min-h-0 lg:min-h-screen bg-[#0033FF] flex flex-col items-center justify-center p-3.5 sm:p-8 lg:p-14">
        <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-white/80">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
