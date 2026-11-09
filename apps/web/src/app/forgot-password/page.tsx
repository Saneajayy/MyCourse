'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { Check, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        skipAuth: true,
      });

      setIsSubmitted(true);
      toastSuccess(
        'Request Received',
        'If an account exists for this email, reset instructions have been sent.',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(msg);
      toastError('Request Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="relative w-full bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl p-5 sm:p-8 select-none overflow-hidden">
            {isSubmitted ? (
              <div className="text-center py-4 space-y-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                  Reset Instructions Sent
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                  If an account exists with <strong className="text-neutral-900 font-semibold">{email}</strong>,
                  we have sent a secure password reset link. Please check your inbox and spam folder.
                </p>
                <div className="pt-4 border-t border-neutral-200 flex flex-col gap-3">
                  <Link
                    href="/login"
                    className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-base rounded-lg transition-all flex items-center justify-center cursor-pointer"
                  >
                    Return to Login
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setErrorMsg(null);
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors cursor-pointer"
                  >
                    Try another email
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header & Title */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                    Forgot Password?
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                    Enter your registered email address to receive reset instructions
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mb-4 p-3.5 rounded-lg bg-red-600 text-white text-xs sm:text-[13px] font-medium text-center">
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label
                      htmlFor="forgot-email"
                      className="text-sm font-bold text-neutral-900"
                    >
                      Registered Email
                    </label>
                    <div className="relative">
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        placeholder="engineer@plant.com"
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

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] active:scale-[0.99] text-white font-bold text-base rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
                      <span>{isLoading ? 'Sending Link...' : 'Send Reset Link'}</span>
                    </button>
                  </div>
                </form>

                {/* Back to Login Link */}
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
      </div>
    </div>
  );
}
