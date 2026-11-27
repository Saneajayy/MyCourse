'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast, ToastTab } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { Check, Loader2, RotateCw, ArrowLeft } from 'lucide-react';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialStep = searchParams.get('step') === 'otp' && initialEmail ? 'otp' : 'email';

  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<'email' | 'otp'>(initialStep);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(initialStep === 'otp' ? 60 : 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isVerifyingRef = useRef(false);

  // Focus first input box on switching to OTP step
  useEffect(() => {
    if (step === 'otp') {
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const focusIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[focusIndex]?.focus();
    }
  }, [step]);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Send 6-digit OTP code to email
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        skipAuth: true,
      });

      setStep('otp');
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      isVerifyingRef.current = false;
      setIsVerifying(false);
      toastSuccess('Code Sent', 'A 6-digit reset code was sent to your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(msg);
      toastError('Request Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle individual digit inputs
  const handleDigitChange = (index: number, value: string) => {
    if (isVerifyingRef.current) return;

    const rawVal = value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (!rawVal) {
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    newDigits[index] = rawVal[rawVal.length - 1] || '';
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto-advance to next box
    if (index < 5 && rawVal) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are provided
    const combined = newDigits.join('');
    if (combined.length === 6 && newDigits.every((d) => d !== '')) {
      handleVerifyOtp(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isVerifyingRef.current && digits.every((d) => d !== '')) {
        handleVerifyOtp();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isVerifyingRef.current) return;

    const pastedData = e.clipboardData.getData('text').trim();
    const cleanNumbers = pastedData.replace(/\D/g, '').slice(0, 6);

    if (!cleanNumbers) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = cleanNumbers[i] || '';
    }
    setDigits(newDigits);

    const nextIndex = Math.min(cleanNumbers.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (cleanNumbers.length === 6) {
      handleVerifyOtp(cleanNumbers);
    }
  };

  // Step 3: Verify OTP and navigate to /reset-password
  const handleVerifyOtp = async (codeToVerify?: string) => {
    if (isVerifyingRef.current) return;

    const otpCode = codeToVerify || digits.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your reset code.');
      return;
    }

    isVerifyingRef.current = true;
    setErrorMsg(null);
    setIsVerifying(true);

    try {
      const res = await apiClient<{
        success?: boolean;
        resetToken?: string;
        data?: { resetToken?: string };
      }>('/auth/verify-reset-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode.trim(),
        }),
        skipAuth: true,
      });

      const token = res?.resetToken || res?.data?.resetToken;
      if (!token) {
        throw new Error('Reset token was not received. Please request a new code.');
      }

      toastSuccess('Code Verified', 'Please enter your new password.');
      router.push(`/reset-password?token=${encodeURIComponent(token)}`);
    } catch (err: unknown) {
      isVerifyingRef.current = false;
      setIsVerifying(false);
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset code';
      setErrorMsg(msg);
      toastError('Verification Failed', msg);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg(null);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        skipAuth: true,
      });

      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toastSuccess('New Code Sent', 'A fresh 6-digit reset code has been sent to your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code';
      setErrorMsg(msg);
      toastError('Resend Error', msg);
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <div className="relative w-full">
      {/* Error Alert outside the card - floats softly above without shifting card position */}
      <ToastTab
        message={errorMsg}
        onDismiss={() => setErrorMsg(null)}
        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20"
      />

      <div className="relative w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-7 select-none overflow-hidden space-y-4 transition-all text-left">
        {step === 'email' ? (
          <>
            {/* Header */}
            <div className="space-y-1 text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Forgot your Password?
              </h1>
              <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
                Enter your registered email address to receive a 6-digit verification code.
              </p>
            </div>

            {/* Email Input Form */}
            <form onSubmit={handleSendCode} className="space-y-3.5 pt-1">
              <div className="space-y-1.5 text-left">
                <label htmlFor="forgot-email" className="text-xs font-medium text-white block">
                  Registered Email
                </label>
                <div className="relative">
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 pr-9 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 text-sm text-white placeholder:text-neutral-500 rounded-lg outline-none transition-colors"
                  />
                  {email.includes('@') && email.length > 4 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Send Reset Code Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-black" aria-hidden="true" />
                  )}
                  <span>{isLoading ? 'Sending Code...' : 'Send Reset Code \u2192'}</span>
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
        ) : (
          <>
            {/* Header */}
            <div className="space-y-1 text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Please check your email
              </h1>
              <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
                Enter the 6 digit OTP we sent to your email.
              </p>
            </div>

            {/* 6 Digit OTP Inputs Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }}
              className="space-y-4 pt-1"
            >
              <div
                className="flex items-center justify-between gap-1.5 sm:gap-2 my-2"
                onPaste={handlePaste}
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    id={`otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isVerifying}
                    className="w-[44px] h-[50px] sm:w-[48px] sm:h-[54px] text-center text-xl sm:text-2xl font-bold font-mono text-white bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 rounded-lg outline-none transition-colors disabled:opacity-50 select-none"
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Verify & Continue Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isComplete || isVerifying}
                  className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isVerifying && (
                    <Loader2 className="w-4 h-4 animate-spin text-black" aria-hidden="true" />
                  )}
                  <span>{isVerifying ? 'Verifying' : 'Verify \u2192'}</span>
                </button>
              </div>
            </form>

            {/* Resend Code Section */}
            <div className="pt-1 text-center text-xs text-[#c2c4cc]">
              Didn&apos;t receive the code?{' '}
              {resendCooldown > 0 ? (
                <span className="text-[#80828d] font-mono ml-1">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-semibold text-white underline hover:text-white/80 transition-colors ml-1 inline-flex items-center gap-1 cursor-pointer"
                >
                  {isResending && <RotateCw className="w-3 h-3 animate-spin text-white" />}
                  <span>Resend Code</span>
                </button>
              )}
            </div>

            {/* Wrong Account Link */}
            <div className="text-center text-xs text-[#80828d]">
              Wrong account?{' '}
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setErrorMsg(null);
                  isVerifyingRef.current = false;
                  setIsVerifying(false);
                }}
                className="font-semibold text-white underline hover:text-white/80 transition-colors ml-1 cursor-pointer"
              >
                Try another email &rarr;
              </button>
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

export default function ForgotPasswordPage() {
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
      {/* RIGHT CARD: Forgot Password Form                                */}
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
                  Loading form...
                </div>
              }
            >
              <ForgotPasswordContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
