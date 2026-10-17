'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { apiClient } from '../../../lib/api-client';
import { Card, Button, Input, useToast } from '../../../components/ui';
import { ShieldCheck, AlertCircle, QrCode, Key, Download, Check, Copy } from 'lucide-react';

interface Setup2FAResponse {
  qrCode: string;
  manualSecret: string;
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
        body: JSON.stringify({ code: code.trim() }),
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
    if (setupData?.manualSecret) {
      navigator.clipboard.writeText(setupData.manualSecret);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownloadCodes = () => {
    if (!setupData?.recoveryCodes) return;
    const content = `HYDRAULIC ENGINEERING ACADEMY - ADMIN RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\nKeep these codes in a secure, offline location. Each code can be used once if you lose access to your phone.\n\n${setupData.recoveryCodes.join('\n')}\n`;
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
    <Card variant="default" padding="lg" className="border-2 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-10 h-10 bg-course-darkBlue text-course-white inline-flex items-center justify-center border border-black mb-3">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black text-course-darkBlue tracking-tight">
          {isEnrolling ? 'Enroll Two-Factor Authentication' : 'Two-Factor Authentication'}
        </h1>
        <p className="text-xs text-course-navySubtle mt-1">
          {isEnrolling
            ? 'Mandatory security step to safeguard payments and student records'
            : 'Enter the 6-digit code from Google Authenticator or a recovery code'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 border border-black bg-rose-50 text-rose-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: First-time Enrollment Wizard */}
      {isEnrolling ? (
        <div className="space-y-6">
          {setupData ? (
            <>
              {/* Step 1: Scan QR Code */}
              <div className="p-4 border border-black bg-neutral-50 text-center space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-course-darkBlue flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-course-orange" />
                  <span>Step 1: Scan with Google Authenticator</span>
                </div>
                {setupData.qrCode ? (
                  <div className="inline-block p-2 bg-white border border-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={setupData.qrCode} alt="2FA QR Code" className="w-44 h-44 mx-auto" />
                  </div>
                ) : (
                  <div className="p-4 text-xs font-mono">Loading QR Code...</div>
                )}

                <div className="text-[11px] text-course-navySubtle">
                  Can&apos;t scan? Enter this secret manually in your app:
                </div>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-2 py-1 bg-white border border-black font-mono text-xs font-bold select-all">
                    {setupData.manualSecret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopySecret}
                    className="text-xs py-1"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Step 2: Save Recovery Codes */}
              <div className="p-4 border border-black bg-neutral-50 space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-course-darkBlue flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-course-orange" />
                  <span>Step 2: Save Backup Recovery Codes</span>
                </div>
                <p className="text-[11px] text-course-navyMuted">
                  If you ever lose your phone, each of these 10 backup codes can be used once to
                  access the admin panel.
                </p>
                <div className="grid grid-cols-2 gap-1.5 p-3 bg-white border border-black font-mono text-[11px] text-center">
                  {setupData.recoveryCodes.map((codeStr, idx) => (
                    <div key={idx} className="p-1 bg-neutral-50 border border-neutral-200">
                      {codeStr}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCodes}
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download Backup Sheet
                  </Button>
                  <label className="flex items-center gap-2 text-xs font-bold text-course-darkBlue cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savedCodesConfirmed}
                      onChange={(e) => setSavedCodesConfirmed(e.target.checked)}
                      className="w-4 h-4 accent-course-orange"
                    />
                    <span>I have saved my backup codes</span>
                  </label>
                </div>
              </div>

              {/* Step 3: Enter Code to Verify */}
              <form onSubmit={handleEnrollmentSubmit} className="space-y-4 pt-2">
                <Input
                  label="Step 3: Enter 6-digit code to activate"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 123456"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  helperText="Generated by Google Authenticator"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-black uppercase tracking-wider py-3"
                  isLoading={isLoading}
                >
                  Verify &amp; Activate 2FA
                </Button>
              </form>
            </>
          ) : (
            <div className="py-8 text-center text-xs font-bold text-course-navySubtle">
              Initializing 2FA enrollment credentials...
            </div>
          )}
        </div>
      ) : (
        /* Case 2: Standard Login 2FA Challenge */
        <form onSubmit={handleChallengeSubmit} className="space-y-4">
          <Input
            label="Verification Code"
            type="text"
            placeholder="e.g. 123456 or XXXX-XXXX-XXXX"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            helperText="From Google Authenticator or your backup recovery sheet"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full text-xs font-black uppercase tracking-wider py-3"
            isLoading={isLoading}
          >
            Verify &amp; Continue
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function TwoFactorPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-course-white">
      <div className="w-full max-w-lg">
        <Suspense
          fallback={<div className="p-8 text-center text-sm font-bold">Loading 2FA...</div>}
        >
          <TwoFactorFlow />
        </Suspense>
      </div>
    </div>
  );
}
