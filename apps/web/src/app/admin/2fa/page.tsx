'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { Card, Button, Input, useToast } from '../../../components/ui';
import { ShieldCheck, AlertCircle } from 'lucide-react';

function TwoFactorChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempToken = searchParams.get('tempToken') || '';
  const redirectUrl = searchParams.get('redirect') || '/my-courses';

  const { verify2FA } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <Card variant="default" padding="lg" className="border-2">
      <div className="text-center mb-8">
        <div className="w-10 h-10 bg-course-orange text-course-white inline-flex items-center justify-center border border-black mb-3">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black text-course-darkBlue tracking-tight">
          Two-Factor Authentication
        </h1>
        <p className="text-xs text-course-navySubtle mt-1">
          Enter the 6-digit authenticator code or 12-character recovery code
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 border border-black bg-rose-50 text-rose-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
    </Card>
  );
}

export default function TwoFactorPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="p-8 text-center text-sm">Loading 2FA...</div>}>
          <TwoFactorChallengeForm />
        </Suspense>
      </div>
    </div>
  );
}
