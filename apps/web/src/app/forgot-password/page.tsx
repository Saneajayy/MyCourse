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
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
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
    const otpCode = codeToVerify || digits.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your reset code.');
      return;
    }

    setErrorMsg(null);
    setIsVerifying(true);

    try {
      const res = await apiClient<{ success: boolean; data: { resetToken: string } }>(
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

      toastSuccess('Code Verified', 'Please enter your new password.');
      const token = res.data?.resetToken;
      router.push(`/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset code';
      setErrorMsg(msg);
      toastError('Verification Failed', msg);
    } finally {
      setIsVerifying(false);
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

  return (
    <div className="relative w-full bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl p-5 sm:p-8 select-none overflow-hidden">
      {step === 'email' ? (
        <>
          {/* Header & Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Forgot your Password?
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
              Enter the email address associated with your account to receive a 6-digit verification code.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-lg bg-red-600 text-white text-xs sm:text-[13px] font-medium text-center">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
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
                <span>{isLoading ? 'Sending Code...' : 'Send Reset Code'}</span>
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
      ) : (
        <>
          {/* Step 2: 6-Digit OTP Screen */}
          <div className="text-left mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Enter 6-Digit Code
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
              We sent a password reset code to <strong className="text-neutral-900 font-semibold">{email}</strong>.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-lg bg-red-600 text-white text-xs sm:text-[13px] font-medium text-center">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 6 Digits Boxes */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp();
            }}
            className="space-y-5"
          >
            <div className="flex justify-between items-center gap-1.5 sm:gap-2 my-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  aria-label={`Digit ${index + 1}`}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono font-bold text-xl sm:text-2xl text-neutral-900 border border-neutral-300 rounded-lg focus:border-[#0033FF] focus:outline-none focus:ring-1 focus:ring-[#0033FF] transition-all bg-white"
                />
              ))}
            </div>

            {/* Verify Code Button */}
            <button
              type="submit"
              disabled={isVerifying || digits.some((d) => !d)}
              className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] active:scale-[0.99] text-white font-bold text-base rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isVerifying && <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />}
              <span>{isVerifying ? 'Verifying Code...' : 'Verify Code'}</span>
            </button>
          </form>

          {/* Resend Code Section */}
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-600">
            <span>Didn&apos;t receive code?</span>
            {resendCooldown > 0 ? (
              <span className="text-neutral-400 font-mono">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-bold text-[#0033FF] hover:text-[#0028D6] underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isResending && <RotateCw className="w-3 h-3 animate-spin" />}
                <span>Resend Code</span>
              </button>
            )}
          </div>

          {/* Horizontal Divider */}
          <div className="-mx-5 sm:-mx-8 border-t border-neutral-200 my-6" />

          {/* Footer */}
          <p className="text-center text-xs text-neutral-500 leading-normal">
            Wrong account?{' '}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setErrorMsg(null);
              }}
              className="underline hover:text-neutral-800 cursor-pointer"
            >
              Try another email
            </button>
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
          <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-neutral-500">Loading form...</div>}>
            <ForgotPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
