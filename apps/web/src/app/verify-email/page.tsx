'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../components/ui';
import { useAuth, User } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { Loader2, ArrowLeft, RotateCw, Check } from 'lucide-react';

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
  }, [email, isEditingEmail]);

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

    // Auto submit if all 6 digits are filled
    const combined = newDigits.join('');
    if (combined.length === 6 && newDigits.every((d) => d !== '')) {
      if (email.trim()) {
        executeVerification(email.trim(), combined);
      }
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

    if (cleanNumbers.length === 6 && email.trim()) {
      executeVerification(email.trim(), cleanNumbers);
    }
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
        success: boolean;
        message: string;
        user?: User;
        accessToken?: string;
        defaultRedirect?: string;
      }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({
          email: targetEmail.trim(),
          otp: otpCode,
        }),
        skipAuth: true,
      });

      if (res.user && res.accessToken) {
        setSession(res.user, res.accessToken);
      }

      setStatus('success');
      toastSuccess('Welcome to HydroBasics!', 'Account verified and signed in.');

      // Determine redirect target: URL parameter > backend recommendation > /checkout or /my-courses
      const targetDestination = redirectParam || res.defaultRedirect || '/my-courses';

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
    <div className="relative w-full bg-white border border-neutral-200/90 rounded-2xl shadow-sm lg:border-none lg:rounded-none lg:shadow-none lg:bg-transparent p-5 sm:p-7 select-none flex flex-col items-center text-center">
      {/* Main Headline - In One Line on Desktop */}
      <h1 className="text-2xl sm:text-[28px] md:text-[30px] font-bold text-neutral-900 lg:text-white tracking-tight sm:whitespace-nowrap mb-2.5">
        Please check your email
      </h1>

      {/* Subtitle & Email */}
      <div className="text-neutral-600 lg:text-white text-[13px] sm:text-[14px] font-normal mb-6 space-y-0.5">
        <p className="text-neutral-600 lg:text-white">Enter the 6 digit OTP we sent you to</p>
        {isEditingEmail ? (
          <div className="inline-flex items-center gap-2 mt-1">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="bg-neutral-50 lg:bg-white/15 border border-neutral-300 lg:border-white rounded px-2.5 py-0.5 text-xs sm:text-sm text-neutral-900 lg:text-white placeholder-neutral-400 lg:placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-[#0033FF] lg:focus:ring-white text-center font-normal"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsEditingEmail(false)}
              className="text-xs font-bold text-white bg-[#0033FF] lg:bg-white/25 hover:bg-[#0028D6] lg:hover:bg-white/35 px-2 py-0.5 rounded transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <div>
            <span
              onClick={() => setIsEditingEmail(true)}
              className="text-neutral-900 lg:text-white font-medium lg:font-normal cursor-pointer break-all hover:opacity-80 lg:hover:opacity-90 inline-block"
            >
              {email || 'your email address'}
            </span>
          </div>
        )}
      </div>

      {/* Success Info Message Banner */}
      {infoMessage && (
        <div className="mb-5 px-3.5 py-2 rounded bg-emerald-600 text-white text-xs font-medium shadow-md max-w-[300px] w-full animate-in fade-in duration-200">
          {infoMessage}
        </div>
      )}

      {/* Error Message Alert Banner */}
      {errorMessage && (
        <div className="mb-5 px-3.5 py-2 rounded bg-rose-600 text-white text-xs font-medium shadow-md max-w-[300px] w-full animate-in fade-in duration-200">
          {errorMessage}
        </div>
      )}

      {/* 6 Digit OTP Inputs Form */}
      <form onSubmit={handleManualSubmit} className="w-full flex flex-col items-center space-y-6">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
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
              className="w-[38px] h-[44px] sm:w-[42px] sm:h-[48px] text-center text-xl sm:text-2xl font-bold text-neutral-900 bg-white border border-neutral-300 focus:border-[#0033FF] focus:ring-1 focus:ring-[#0033FF] caret-[#0033FF] lg:text-white lg:bg-transparent lg:border-white lg:focus:bg-white/10 lg:focus:border-white lg:focus:ring-white lg:caret-white rounded-[4px] focus:outline-none transition-all disabled:opacity-50 select-none"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Verify & Continue Button with Auto-Login Success Transition */}
        <button
          type="submit"
          disabled={!isComplete || status === 'verifying' || status === 'success'}
          className={`w-full max-w-[240px] sm:w-[240px] h-[44px] lg:h-[42px] font-bold text-[14px] sm:text-[15px] rounded-lg lg:rounded-[4px] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            status === 'success'
              ? 'bg-emerald-600 text-white lg:bg-white lg:text-emerald-700'
              : 'bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] lg:bg-[#D1D5DB] lg:hover:bg-white lg:active:bg-neutral-200 text-white lg:text-[#0033FF]'
          }`}
        >
          {status === 'verifying' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white lg:text-[#0033FF]" />
              <span>Verifying...</span>
            </>
          ) : status === 'success' ? (
            <>
              <Check className="w-4 h-4 stroke-[3] text-white lg:text-emerald-600" />
              <span>Verified! Redirecting...</span>
            </>
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>
      </form>

      {/* Resend Code Section */}
      <div className="mt-6 flex flex-col items-center gap-1 text-[13px] text-neutral-600 lg:text-white">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <span className="text-neutral-600 lg:text-white">Didn't receive the email?</span>
          {resendCooldown > 0 ? (
            <span className="text-neutral-400 lg:text-white/60 font-normal">
              Resend in {resendCooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              className="font-semibold text-[#0033FF] hover:text-[#0028D6] lg:text-white lg:hover:opacity-80 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isResending && <RotateCw className="w-3 h-3 animate-spin text-[#0033FF] lg:text-white" />}
              <span>Resend Code</span>
            </button>
          )}
        </div>
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

      {/* Right Column: White on Mobile, Royal Blue (#0033FF) on Desktop */}
      <div className="w-full lg:w-1/2 h-full bg-white lg:bg-[#0033FF] flex flex-col overflow-y-auto relative">
        {/* Top Header Bar inside the right area: Back to Course & HYDRO BASICS */}
        <header className="w-full flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8 shrink-0 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#0033FF] lg:text-white lg:hover:text-white/80 text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Course</span>
          </Link>

          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-[#0033FF] lg:text-white hover:opacity-90 transition-opacity select-none text-right"
            aria-label="HYDRO BASICS Home"
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
              <div className="p-8 text-center text-sm font-mono text-neutral-600 lg:text-white flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#0033FF] lg:text-white" />
                <span>Loading verification...</span>
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
