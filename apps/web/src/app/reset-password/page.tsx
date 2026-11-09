'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialEmail = searchParams.get('email') || '';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token.trim()) {
      setErrorMsg('Reset token is missing. Please request a verification code.');
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
    <div className="relative w-full bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl p-5 sm:p-8 select-none overflow-hidden">
      {/* Card Content */}
      <div className="w-full">
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
                className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-base rounded-lg transition-all flex items-center justify-center cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          </div>
        ) : !token && !initialToken ? (
          <div className="text-center py-4 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Verification Code Required
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
              To reset your password, please start by requesting a 6-digit code for your email address.
            </p>
            <div className="pt-4 border-t border-neutral-200">
              <Link
                href="/forgot-password"
                className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-base rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Request Reset Code</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header & Title - Sizing & Placing identical to login, signup, and verify-email */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-[28px] md:text-[30px] font-bold text-neutral-900 tracking-tight">
                Create New Password
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                {initialEmail ? (
                  <>Setting new password for <strong className="text-neutral-900 font-semibold">{initialEmail}</strong></>
                ) : (
                  'Choose a secure new password of at least 10 characters'
                )}
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-lg bg-red-600 text-white text-xs sm:text-[13px] font-medium text-center">
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* New Password */}
              <div className="space-y-1.5 text-left">
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
                    className="w-full h-[44px] sm:h-[46px] rounded-lg border border-neutral-300 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none focus:ring-1 focus:ring-[#0033FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
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
              <div className="space-y-1.5 text-left">
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
                    className="w-full h-[44px] sm:h-[46px] rounded-lg border border-neutral-300 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none focus:ring-1 focus:ring-[#0033FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
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
                  className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] active:scale-[0.99] text-white font-bold text-base rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
                  <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
              </div>
            </form>

            {/* Back to Login */}
            <div className="mt-5 text-center text-sm text-neutral-600">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-bold text-[#0033FF] underline hover:text-[#0028D6] ml-1"
              >
                Sign in
              </Link>
            </div>

            {/* Horizontal Divider */}
            <div className="-mx-5 sm:-mx-8 border-t border-neutral-200 my-6" />

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

      {/* Right Column: Clean White Background on both Mobile & Desktop */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col overflow-y-auto relative">
        {/* Top Header Bar inside the right side area */}
        <header className="w-full flex items-center justify-end px-5 pt-5 sm:px-8 sm:pt-8 shrink-0 z-20">
          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-[#0033FF] hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
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

        {/* Perfectly Centered Card */}
        <div className="m-auto w-full max-w-[420px] sm:max-w-[440px] px-4 py-6 sm:py-8 relative z-10">
          <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-neutral-500">Loading reset form...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
