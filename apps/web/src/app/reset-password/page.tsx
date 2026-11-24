'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast, ToastTab } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  const isTokenInvalid = !token?.trim() || token === 'undefined' || token === 'null';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isTokenInvalid) {
      setErrorMsg('Reset token is missing or invalid. Please request a verification code.');
      return;
    }

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
          password: newPassword,
          newPassword,
        }),
        skipAuth: true,
      });

      setIsSuccess(true);
      toastSuccess(
        'Password Updated',
        'Your password was successfully updated. Sign in with your new password.',
      );
      router.push('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset token';
      setErrorMsg(msg);
      toastError('Reset Failed', msg);
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
        {isSuccess ? (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-white mx-auto" />
            <p className="text-xs text-[#c2c4cc]">Password updated! Redirecting to sign in...</p>
          </div>
        ) : isTokenInvalid ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Reset Token Required
            </h2>
            <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
              To reset your password, please start by requesting a 6-digit code for your email
              address.
            </p>
            <div className="pt-2">
              <Link
                href="/forgot-password"
                className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Request Reset Code &rarr;</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="space-y-1 text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Create New Password
              </h1>
              <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
                Choose a secure new password of at least 10 characters.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              {/* New Password */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="reset-password" className="text-xs font-medium text-white block">
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
                    className="w-full h-10 px-3 pr-10 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 text-sm text-white placeholder:text-neutral-500 rounded-lg outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1 focus:outline-none"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="reset-confirm-password"
                  className="text-xs font-medium text-white block"
                >
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
                    className="w-full h-10 px-3 pr-10 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 text-sm text-white placeholder:text-neutral-500 rounded-lg outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
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
                  <span>{isLoading ? 'Updating Password' : 'Save New Password \u2192'}</span>
                </button>
              </div>
            </form>

            {/* Back to Login */}
            <div className="pt-1 text-center text-xs text-[#c2c4cc]">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-semibold text-white underline hover:text-white/80 transition-colors ml-1"
              >
                Sign in &rarr;
              </Link>
            </div>

            {/* Horizontal Divider */}
            <div className="-mx-5 sm:-mx-7 border-t border-white/[0.06] pt-4" />

            {/* Footer Disclaimer */}
            <p className="text-center text-[11px] text-[#80828d] leading-normal">
              Need assistance? Contact our{' '}
              <Link href="/contact" className="underline hover:text-white transition-colors">
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
      {/* RIGHT CARD: Reset Password Form                                 */}
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
            href="/login"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-[#c2c4cc]/70 hover:text-white transition-colors ml-auto"
            title="Back to Sign In"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Sign In</span>
          </Link>
        </div>

        {/* Thin Stroke Separation Line */}
        <div className="border-b border-white/[0.08] w-full shrink-0" />

        {/* Form Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 py-8 sm:px-6 sm:py-10 lg:p-8 flex flex-col items-center">
          <div className="w-full max-w-[420px] sm:max-w-[440px] space-y-4 my-auto">
            <Suspense
              fallback={
                <div className="p-8 text-center text-xs font-mono text-[#c2c4cc]">
                  Loading reset form...
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
