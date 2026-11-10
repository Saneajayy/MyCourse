'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../components/ui';
import { useAuth, User } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { Loader2, RotateCw, Check } from 'lucide-react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const initialEmail = searchParams.get('email') || '';
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

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

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
    if (!targetEmail.trim()) {
      setErrorMessage('Please provide your email address.');
      setIsEditingEmail(true);
      return;
    }
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits.');
      return;
    }

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

      // Determine redirect target: URL parameter > backend recommendation > /my-courses
      const targetDestination = redirectParam || defaultRedirect || '/my-courses';

      setTimeout(() => {
        router.push(targetDestination);
      }, 500);
    } catch (err: unknown) {
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
    <div className="relative w-full bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl p-5 sm:p-8 select-none overflow-hidden">
      <div className="w-full">
        {/* Header & Title - Sizing & Placing identical to login, signup, and forgot pwd */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[28px] md:text-[30px] font-bold text-neutral-900 tracking-tight">
            Please check your email
          </h1>
          <div className="text-neutral-600 text-[13px] sm:text-[14px] font-normal mt-1.5 space-y-0.5">
            <p>Enter the 6 digit OTP we sent you to</p>
            {isEditingEmail ? (
              <div className="inline-flex items-center gap-2 mt-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#0033FF] text-center font-normal"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(false)}
                  className="text-xs font-bold text-white bg-[#0033FF] hover:bg-[#0028D6] px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div>
                <span
                  onClick={() => setIsEditingEmail(true)}
                  className="text-neutral-900 font-medium cursor-pointer break-all hover:text-[#0033FF] transition-colors inline-block"
                  title="Click to edit email"
                >
                  {email || 'your email address'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info/Success message */}
        {infoMessage && (
          <div className="mb-4 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 text-xs sm:text-[13px] font-medium text-center">
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-700 text-xs sm:text-[13px] font-medium text-center">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 6 Digit OTP Inputs Form */}
        <form onSubmit={handleManualSubmit} className="space-y-5">
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
                disabled={status === 'verifying' || status === 'success'}
                className="w-[38px] h-[44px] sm:w-[42px] sm:h-[48px] text-center text-xl sm:text-2xl font-bold text-neutral-900 bg-white border border-neutral-300 focus:border-[#0033FF] focus:ring-1 focus:ring-[#0033FF] caret-[#0033FF] rounded-[4px] focus:outline-none transition-all disabled:opacity-50 select-none"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Verify & Continue Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isComplete || status === 'verifying' || status === 'success'}
              className="w-full h-[46px] sm:h-[48px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] active:scale-[0.99] text-white font-bold text-base rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'verifying' ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin text-white" aria-hidden="true" />
                  <span>Verifying Code...</span>
                </>
              ) : status === 'success' ? (
                <>
                  <Check className="w-4.5 h-4.5 stroke-[3] text-white" aria-hidden="true" />
                  <span>Verified! Redirecting...</span>
                </>
              ) : (
                <span>Verify &amp; Continue</span>
              )}
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
                onClick={handleResendOtp}
                disabled={isResending}
                className="font-semibold text-[#0033FF] hover:text-[#0028D6] underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isResending && <RotateCw className="w-3 h-3 animate-spin text-[#0033FF]" />}
                <span>Resend Code</span>
              </button>
            )}
          </div>
        </div>

        {/* Wrong Account Link - Sized and styled identically to Create an account on login / Try another email on forgot-password */}
        <div className="mt-5 text-center text-sm text-neutral-600">
          Wrong account?{' '}
          <Link
            href="/register"
            className="font-bold text-[#0033FF] underline hover:text-[#0028D6] ml-1 cursor-pointer"
          >
            Try another email
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
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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

        {/* Centered OTP Verification Area */}
        <div className="m-auto w-full max-w-[420px] sm:max-w-[440px] px-4 py-6 sm:py-8 relative z-10">
          <Suspense
            fallback={
              <div className="p-8 text-center text-sm font-mono text-neutral-500">
                Loading verification...
              </div>
            }
          >
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
