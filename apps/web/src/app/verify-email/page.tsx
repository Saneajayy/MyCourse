'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast, ToastTab } from '../../components/ui';
import { useAuth, User } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { Loader2, RotateCw, Check, ArrowLeft } from 'lucide-react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession, user } = useAuth();
  const initialEmail = searchParams.get('email') || user?.email || '';
  const initialOtp = searchParams.get('otp') || searchParams.get('token') || '';
  const redirectParam = searchParams.get('redirect');

  const { success: toastSuccess, error: toastError } = useToast();

  const [email, setEmail] = useState<string>(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(!initialEmail);
  const [digits, setDigits] = useState<string[]>(() => {
    if (initialOtp && initialOtp.length === 6 && /^\d+$/.test(initialOtp)) {
      return initialOtp.split('');
    }
    return ['', '', '', '', '', ''];
  });
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(initialEmail ? 60 : 0);
  const [isResending, setIsResending] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isVerifyingRef = useRef(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Sync email from auth session if navigated without email in URL
  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
      setIsEditingEmail(false);
      setResendCooldown(60);
    }
  }, [user?.email, email]);

  // Focus first empty input on mount
  useEffect(() => {
    if (email && !isEditingEmail) {
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const focusIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[focusIndex]?.focus();
    }
  }, [email, isEditingEmail, digits]);

  // Auto verify if complete 6-digit OTP provided in URL
  useEffect(() => {
    if (initialEmail && initialOtp && initialOtp.length === 6 && /^\d+$/.test(initialOtp)) {
      executeVerification(initialEmail, initialOtp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setErrorMessage('');
    setInfoMessage('');

    // Auto advance to next input box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
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
  };

  const executeVerification = async (targetEmail: string, otpCode: string) => {
    if (isVerifyingRef.current) return;

    if (!targetEmail.trim()) {
      setErrorMessage('Please provide your email address.');
      setIsEditingEmail(true);
      return;
    }
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits.');
      return;
    }

    isVerifyingRef.current = true;
    setStatus('verifying');
    setErrorMessage('');

    try {
      const res = await apiClient<{
        success?: boolean;
        message?: string;
        user?: User;
        accessToken?: string;
        defaultRedirect?: string;
        data?: {
          user?: User;
          accessToken?: string;
          defaultRedirect?: string;
        };
      }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          email: targetEmail.trim(),
          otp: otpCode,
        }),
        skipAuth: true,
      });

      const user = res?.user || res?.data?.user;
      const accessToken = res?.accessToken || res?.data?.accessToken;
      const defaultRedirect = res?.defaultRedirect || res?.data?.defaultRedirect;

      if (user && accessToken) {
        setSession(user, accessToken);
      }

      setStatus('success');
      toastSuccess('Welcome to HydroBasics!', 'Account verified and signed in.');

      // Determine redirect target: URL parameter > backend recommendation > /dashboard
      const targetDestination = redirectParam || defaultRedirect || '/dashboard';

      setTimeout(() => {
        router.push(targetDestination);
      }, 500);
    } catch (err: unknown) {
      isVerifyingRef.current = false;
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Invalid or expired verification code.';
      setErrorMessage(msg);
      toastError('Verification Failed', msg);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeVerification(email, digits.join(''));
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    if (!email.trim()) {
      setErrorMessage('Please enter your email to receive a verification code.');
      setIsEditingEmail(true);
      return;
    }

    setIsResending(true);
    setErrorMessage('');

    try {
      await apiClient<{ message: string }>('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
        skipAuth: true,
      });

      setResendCooldown(60);
      setInfoMessage('New 6-digit code has been sent to your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to resend verification code.';
      setErrorMessage(msg);
      toastError('Resend Failed', msg);
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <div className="relative w-full">
      {/* Toast Tabs outside the card - floats softly above without shifting card position */}
      <ToastTab
        message={errorMessage}
        onDismiss={() => setErrorMessage('')}
        variant="error"
        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20"
      />
      <ToastTab
        message={infoMessage}
        onDismiss={() => setInfoMessage('')}
        variant="success"
        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20"
      />

      <div className="relative w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-7 select-none overflow-hidden space-y-4 transition-all text-left">
      {/* Header */}
      <div className="space-y-1 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Please check your email
        </h1>
        <div className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed">
          <span>Enter the 6 digit OTP we sent to </span>
          {isEditingEmail ? (
            <div className="inline-flex items-center justify-center gap-2 mt-2 w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="flex-1 max-w-[240px] h-8 px-2.5 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 text-xs text-white placeholder:text-neutral-500 rounded-lg outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsEditingEmail(false)}
                className="h-8 px-3 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              className="text-white font-medium underline underline-offset-2 hover:text-white/80 transition-colors cursor-pointer"
              title="Click to edit email"
            >
              {email || 'your email address'}
            </button>
          )}
        </div>
      </div>

      {/* 6 Digit OTP Form */}
      <form onSubmit={handleManualSubmit} className="space-y-4 pt-1">
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
              disabled={status === 'verifying' || status === 'success'}
              className="w-[44px] h-[50px] sm:w-[48px] sm:h-[54px] text-center text-xl sm:text-2xl font-bold font-mono text-white bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] focus:border-white/30 rounded-lg outline-none transition-colors disabled:opacity-50 select-none"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isComplete || status === 'verifying' || status === 'success'}
            className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            {status === 'verifying' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" aria-hidden="true" />
                <span>Verifying Code...</span>
              </>
            ) : status === 'success' ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5] text-emerald-600" aria-hidden="true" />
                <span>Verified! Redirecting...</span>
              </>
            ) : (
              <span>Verify &amp; Continue &rarr;</span>
            )}
          </button>
        </div>
      </form>

      {/* Resend Section */}
      <div className="pt-1 text-center text-xs text-[#c2c4cc]">
        Didn&apos;t receive the code?{' '}
        {resendCooldown > 0 ? (
          <span className="text-[#80828d] font-mono ml-1">Resend in {resendCooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
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
        <Link
          href="/register"
          className="font-semibold text-white underline hover:text-white/80 transition-colors ml-1"
        >
          Try another email &rarr;
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
    </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
      {/* RIGHT CARD: Verify Email Form                                   */}
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
                  Loading verification...
                </div>
              }
            >
              <VerifyEmailForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
