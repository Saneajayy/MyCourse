'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { Check, Loader2, RotateCw } from 'lucide-react';

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

  // Step 2: Handle individual digit inputs (identical to verify-email)
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
    // Synchronously lock out duplicate calls (Enter key + auto-verify + button click)
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
      const res = await apiClient<{ success?: boolean; resetToken?: string; data?: { resetToken?: string } }>(
        '/auth/verify-reset-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp: otpCode.trim(),
          }),
          skipAuth: true,
        },
      );

      const token = res?.resetToken || res?.data?.resetToken;
      if (!token) {
        throw new Error('Reset token was not received. Please request a new code.');
      }

      toastSuccess('Code Verified', 'Please enter your new password.');
      // Keep isVerifyingRef.current = true during route transition so no subsequent submit can trigger
      router.push(`/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: unknown) {
      // Only unlock on error so user can re-try
      isVerifyingRef.current = false;
      setIsVerifying(false);
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset code';
      setErrorMsg(msg);
      toastError('Verification Failed', msg);
    }
  };

  // Resend code handler
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
    <div className="relative w-full bg-white border border-neutral-200/80 rounded-none p-5 sm:p-8 select-none overflow-hidden">
      {step === 'email' ? (
        <>
          {/* Main Headline - Sizing & Placing identical to login, signup, and verify-email */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[28px] md:text-[30px] font-bold text-neutral-900 tracking-tight">
              Forgot your Password?
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
              Enter the email address associated with your account to receive a 6-digit reset code.
            </p>
          </div>

          {/* Error Message Alert Banner */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-none bg-red-500/10 border border-red-500/25 text-red-700 text-xs sm:text-[13px] font-medium text-center">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email Input Form */}
          <form onSubmit={handleSendCode} className="space-y-4">
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
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[44px] sm:h-[46px] rounded-none border border-neutral-300 bg-white px-3.5 pr-10 text-sm text-neutral-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
                />
                {email.includes('@') && email.length > 4 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                )}
              </div>
            </div>

            {/* Send Reset Code Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full h-[46px] sm:h-[48px] bg-black hover:bg-[#262626] active:bg-[#171717] active:scale-[0.99] text-white font-bold text-base rounded-none transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
                <span>{isLoading ? 'Sending Code...' : 'Send Reset Code'}</span>
              </button>
            </div>
          </form>

          {/* Back to Login Link */}
          <div className="mt-5 text-center text-sm text-neutral-600">
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-bold text-black underline hover:text-[#262626] ml-1"
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
      ) : (
        <>
          {/* Main Headline - In One Line on Desktop (exact verify-email sizing and placing) */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[28px] md:text-[30px] font-bold text-neutral-900 tracking-tight">
              Please check your email
            </h1>
            <div className="text-neutral-600 text-[13px] sm:text-[14px] font-normal mt-1.5 space-y-0.5">
              <p>Enter the 6 digit OTP we sent to your email.</p>

            </div>
          </div>

          {/* Error Message Alert Banner */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-none bg-red-500/10 border border-red-500/25 text-red-700 text-xs sm:text-[13px] font-medium text-center">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 6 Digit OTP Inputs Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp();
            }}
            className="space-y-5"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-2" onPaste={handlePaste}>
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
                  className="w-[38px] h-[44px] sm:w-[42px] sm:h-[48px] text-center text-xl sm:text-2xl font-bold text-neutral-900 bg-white border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black caret-black rounded-none focus:outline-none transition-all disabled:opacity-50 select-none"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {/* Verify & Continue Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isComplete || isVerifying}
                className="w-full h-[46px] sm:h-[48px] bg-black hover:bg-[#262626] active:bg-[#171717] active:scale-[0.99] text-white font-bold text-base rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isVerifying && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
                <span>{isVerifying ? 'Verifying Code...' : 'Verify & Continue'}</span>
              </button>
            </div>
          </form>

          {/* Resend Code Section */}
          <div className="mt-5 flex flex-col items-center gap-1 text-[13px] text-neutral-600">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span>Didn&apos;t receive the email?</span>
              {resendCooldown > 0 ? (
                <span className="text-neutral-400 font-normal">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-semibold text-black hover:text-[#262626] underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isResending && <RotateCw className="w-3 h-3 animate-spin text-black" />}
                  <span>Resend Code</span>
                </button>
              )}
            </div>
          </div>

          {/* Wrong Account Link - Sized and styled identically to Create an account on login */}
          <div className="mt-5 text-center text-sm text-neutral-600">
            Wrong account?{' '}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setErrorMsg(null);
                isVerifyingRef.current = false;
                setIsVerifying(false);
              }}
              className="font-bold text-black underline hover:text-[#262626] ml-1 cursor-pointer"
            >
              Try another email
            </button>
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
  );
}

export default function ForgotPasswordPage() {
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

      {/* Right Column: Clean White Background on both Mobile & Desktop */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col overflow-y-auto relative">
        {/* Top Header Bar inside the right side area */}
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

        {/* Centered OTP Verification Area */}
        <div className="m-auto w-full max-w-[420px] sm:max-w-[440px] px-4 py-6 sm:py-8 relative z-10">
          <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-neutral-500">Loading form...</div>}>
            <ForgotPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
