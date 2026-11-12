'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui';
import { ShieldCheck, AlertCircle, Download, Check, Copy, ArrowRight } from 'lucide-react';

interface Setup2FAResponse {
  qrCode?: string;
  qrCodeDataUrl?: string;
  manualSecret?: string;
  manualEntryKey?: string;
  recoveryCodes: string[];
}

function TwoFactorFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get('tempToken') || '';
  const redirectUrl = searchParams.get('redirect') || '/admin';

  const { user, verify2FA, refreshUser } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Enrollment Wizard State (for logged-in admin without 2FA)
  const isEnrolling = !!user && !user.twoFactorEnabled && !tempToken;
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [savedCodesConfirmed, setSavedCodesConfirmed] = useState(false);

  const qrCodeImage = setupData?.qrCode || setupData?.qrCodeDataUrl;
  const manualSecretKey = setupData?.manualSecret || setupData?.manualEntryKey;

  useEffect(() => {
    let mounted = true;
    if (isEnrolling && !setupData) {
      apiClient<Setup2FAResponse>('/auth/2fa/setup', { method: 'POST' })
        .then((data) => {
          if (mounted) setSetupData(data);
        })
        .catch((err) => {
          if (mounted) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to initialize 2FA setup');
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [isEnrolling, setupData]);

  // Handle Login Challenge Verification
  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tempToken) {
      setErrorMsg('Two-factor session has expired. Please log in again.');
      return;
    }

    setIsLoading(true);
    try {
      await verify2FA(tempToken, code.trim());
      toastSuccess('2FA Verified', 'Authentication successful.');
      router.push(redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid two-factor authentication code';
      setErrorMsg(msg);
      toastError('2FA Verification Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Initial Enrollment Verification
  const handleEnrollmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!savedCodesConfirmed) {
      setErrorMsg('Please confirm that you have saved your backup recovery codes.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token: code.trim(), code: code.trim() }),
      });

      await refreshUser();
      toastSuccess('2FA Activated', 'Two-factor authentication is now active on your account.');
      router.push('/admin');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Invalid verification code. Please check your authenticator app.';
      setErrorMsg(msg);
      toastError('2FA Activation Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (manualSecretKey) {
      navigator.clipboard.writeText(manualSecretKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownloadCodes = () => {
    if (!setupData?.recoveryCodes) return;
    const content = `HYDRO BASICS - ADMIN RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\nKeep these codes in a secure, offline location. Each code can be used once if you lose access to your phone.\n\n${setupData.recoveryCodes.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-2fa-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedCodesConfirmed(true);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-neutral-200/80 shadow-sm overflow-hidden select-text">
      {/* Top Header Strip with edge-to-edge dividing border */}
      <div className="p-5 sm:p-6 border-b border-neutral-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-900 text-white font-mono text-[10px] uppercase font-bold tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Security Checkpoint</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">TOTP RFC 6238</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
          {isEnrolling ? 'Enroll Two-Factor Authentication' : 'Two-Factor Authentication'}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed mt-1">
          {isEnrolling
            ? 'Mandatory security step to safeguard customer data, course content, and financial transactions.'
            : 'Enter the 6-digit verification code from Google Authenticator or an offline recovery code.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 border-b border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Case 1: First-time Enrollment Wizard */}
      {isEnrolling ? (
        <div>
          {setupData ? (
            <>
              {/* Step 1: Scan QR Code */}
              <div className="p-5 sm:p-6 border-b border-neutral-200/80 space-y-3 bg-neutral-50/40">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  <span className="w-5 h-5 bg-neutral-900 text-white flex items-center justify-center font-mono text-[11px]">
                    1
                  </span>
                  <span>Scan with Authenticator App</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Open Google Authenticator, Authy, or Apple Passwords on your phone and scan the code below.
                </p>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-2">
                  <div className="p-2.5 bg-white border border-neutral-200/90 shadow-sm shrink-0">
                    {qrCodeImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={qrCodeImage}
                        alt="2FA QR Code"
                        className="w-36 h-36 mx-auto block"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-xs font-mono text-neutral-400">
                        Loading QR...
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
                      Or Enter Key Manually
                    </label>
                    <div className="flex items-center gap-1.5">
                      <code className="flex-1 px-2.5 py-1.5 bg-white border border-neutral-200 font-mono text-xs font-bold text-neutral-800 select-all overflow-x-auto">
                        {manualSecretKey || '...'}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="p-1.5 border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 min-h-[34px] min-w-[34px] inline-flex items-center justify-center transition-colors shrink-0"
                        title="Copy Secret Key"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight">
                      Account name will appear as <strong>HydraulicEngineeringAcademy</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Save Recovery Codes */}
              <div className="p-5 sm:p-6 border-b border-neutral-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  <span className="w-5 h-5 bg-neutral-900 text-white flex items-center justify-center font-mono text-[11px]">
                    2
                  </span>
                  <span>Save Backup Recovery Codes</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Store these 10 one-time recovery codes in a secure location. Each code can bypass 2FA once if you lose access to your device.
                </p>

                <div className="grid grid-cols-2 gap-1.5 p-3 bg-neutral-50 border border-neutral-200 font-mono text-xs text-center text-neutral-800 select-all">
                  {setupData.recoveryCodes.map((codeStr, idx) => (
                    <div
                      key={idx}
                      className="py-1 px-1.5 bg-white border border-neutral-200/80 font-bold"
                    >
                      {codeStr}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadCodes}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-300 hover:border-neutral-900 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Backup Sheet</span>
                  </button>

                  <label className="flex items-center gap-2 text-xs font-medium text-neutral-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={savedCodesConfirmed}
                      onChange={(e) => setSavedCodesConfirmed(e.target.checked)}
                      className="w-4 h-4 accent-neutral-900 rounded-none cursor-pointer"
                    />
                    <span>I have safely saved my backup codes</span>
                  </label>
                </div>
              </div>

              {/* Step 3: Enter Code to Verify */}
              <form onSubmit={handleEnrollmentSubmit} className="p-5 sm:p-6 space-y-4 bg-neutral-50/20">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  <span className="w-5 h-5 bg-neutral-900 text-white flex items-center justify-center font-mono text-[11px]">
                    3
                  </span>
                  <span>Enter Code to Activate</span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-code" className="text-xs font-medium text-neutral-700 block">
                    6-Digit Code from Authenticator App:
                  </label>
                  <input
                    id="auth-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 focus:outline-none font-mono text-center text-xl tracking-[0.3em] font-bold text-neutral-900 placeholder:text-neutral-300 transition-colors"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Codes refresh every 30 seconds automatically.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !savedCodesConfirmed || code.length < 6}
                  className="w-full py-3 px-4 bg-neutral-900 hover:bg-black text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {isLoading ? (
                    <span>Verifying Code...</span>
                  ) : (
                    <>
                      <span>Verify &amp; Activate 2FA</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
              <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent animate-spin mx-auto" />
              <p>Initializing 2FA enrollment credentials...</p>
            </div>
          )}
        </div>
      ) : (
        /* Case 2: Standard Login 2FA Challenge */
        <form onSubmit={handleChallengeSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="challenge-code" className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
              6-Digit Authenticator Code or Backup Code
            </label>
            <input
              id="challenge-code"
              type="text"
              placeholder="e.g. 123456 or XXXX-XXXX-XXXX"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-neutral-300 focus:border-neutral-900 focus:outline-none font-mono text-center text-lg font-bold text-neutral-900 tracking-wider transition-colors"
            />
            <p className="text-[11px] text-neutral-500">
              Open Google Authenticator on your phone or paste an offline backup code.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="w-full py-3 px-4 bg-neutral-900 hover:bg-black text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoading ? <span>Verifying...</span> : <span>Verify &amp; Continue</span>}
          </button>
        </form>
      )}

      {/* Footer metadata strip */}
      <div className="px-5 sm:px-6 py-2.5 border-t border-neutral-200/80 bg-neutral-50/50 flex items-center justify-between text-[11px] font-mono text-neutral-400">
        <span>AES-256 Encrypted</span>
        <span>HMAC-SHA1 Time-based</span>
      </div>
    </div>
  );
}

export default function TwoFactorPage() {
  return (
    <div className="min-h-screen py-10 px-4 flex items-center justify-center bg-neutral-50/50 font-reddit">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-neutral-500 font-mono">
            Loading security module...
          </div>
        }
      >
        <TwoFactorFlow />
      </Suspense>
    </div>
  );
}
