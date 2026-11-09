'use client';

import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });

      setIsSubmitted(true);
      toastSuccess(
        'Request Received',
        'If an account exists for this email, reset instructions have been sent.',
      );
    } catch (err: unknown) {
      toastError('Request Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Right Column: Royal Blue Canvas with Centered Plain Rounded White Card (80% on mobile) */}
      <div className="relative w-full lg:w-1/2 flex-1 min-h-0 lg:min-h-screen bg-[#0033FF] flex flex-col items-center justify-center p-3.5 sm:p-8 lg:p-14">
        <div className="w-full max-w-[430px] sm:max-w-[460px] bg-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 md:p-9 text-neutral-900 border border-neutral-200/80 relative z-10 select-none">
          {/* Card Content */}
          <div className="w-full">
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
                    className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-base rounded-md sm:rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer"
                  >
                    Return to Login
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors"
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
                        className="w-full h-[44px] sm:h-[46px] rounded-md sm:rounded-lg border border-neutral-400 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
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
                      className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] active:scale-[0.99] text-white font-bold text-base rounded-md sm:rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer border border-[#0033FF]/50"
                    >
                      {isLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
                      <span>{isLoading ? 'Sending Link...' : 'Send Reset Link'}</span>
                    </button>
                  </div>
                </form>

                {/* Back to Login Link */}
                <div className="mt-5 text-center text-sm text-neutral-700">
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
      </div>
    </div>
  );
}
