'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, Button, Input, useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { success: toastSuccess, error: toastError } = useToast();

  const [manualToken, setManualToken] = useState(token || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    token ? 'loading' : 'idle',
  );
  const [message, setMessage] = useState<string>('');

  const executeVerification = async (tok: string) => {
    if (!tok.trim()) return;
    setStatus('loading');
    setMessage('');

    try {
      const res = await apiClient<{ message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: tok.trim() }),
        skipAuth: true,
      });

      setStatus('success');
      setMessage(res.message || 'Your email has been verified successfully!');
      toastSuccess('Verified', 'Email address confirmed successfully.');
    } catch (err: unknown) {
      setStatus('error');
      const errText = err instanceof Error ? err.message : 'Invalid or expired verification token.';
      setMessage(errText);
      toastError('Verification Failed', errText);
    }
  };

  useEffect(() => {
    if (token) {
      executeVerification(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Card variant="default" padding="lg" className="border-2 text-center">
      <div className="w-12 h-12 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black mb-4">
        {status === 'loading' ? (
          <Loader2 className="w-6 h-6 animate-spin text-course-orange" />
        ) : status === 'success' ? (
          <CheckCircle2 className="w-6 h-6 text-course-orange" />
        ) : status === 'error' ? (
          <AlertCircle className="w-6 h-6 text-rose-600" />
        ) : (
          <MailCheck className="w-6 h-6 text-course-darkBlue" />
        )}
      </div>

      <h1 className="text-2xl font-black text-course-darkBlue tracking-tight mb-2">
        Email Verification
      </h1>

      {status === 'loading' && (
        <div className="py-6 space-y-2">
          <p className="text-xs md:text-sm text-course-navyMuted font-mono">
            Validating security token with server...
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="py-6 space-y-4">
          <p className="text-sm font-bold text-course-darkBlue">{message}</p>
          <p className="text-xs text-course-navyMuted">
            Your student account is now fully active. You can now enroll in courses and access the
            learning portal.
          </p>
          <div className="pt-4 border-t border-black">
            <Link
              href="/login"
              className="btn-primary block text-center text-xs uppercase tracking-wide py-3"
            >
              Continue to Sign In
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="py-6 space-y-4">
          <div className="p-3 border border-black bg-rose-50 text-rose-950 text-xs font-bold">
            {message}
          </div>
          <p className="text-xs text-course-navyMuted">
            The link may have expired or already been used. You can paste your token manually below
            or sign in to request a fresh verification link.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeVerification(manualToken);
            }}
            className="space-y-3 pt-2 text-left"
          >
            <Input
              label="Verification Token"
              placeholder="Paste token here"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full text-xs">
              Retry Verification
            </Button>
          </form>

          <div className="pt-4 border-t border-black">
            <Link
              href="/login"
              className="btn-outline block text-center text-xs uppercase tracking-wide py-3"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <div className="py-6 space-y-4 text-left">
          <p className="text-xs text-course-navyMuted text-center">
            Enter the email verification token you received in your inbox.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeVerification(manualToken);
            }}
            className="space-y-3"
          >
            <Input
              label="Verification Token"
              placeholder="Paste token from email"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full text-xs">
              Verify Account
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="p-8 text-center text-sm">Validating email...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
