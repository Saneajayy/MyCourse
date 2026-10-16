'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Card, useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const { error: toastError, success: toastSuccess } = useToast();

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 10) {
      setErrorMsg('Password must be at least 10 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
        }),
        skipAuth: true,
      });

      setIsSuccess(true);
      toastSuccess(
        'Password Updated',
        'Your password was successfully updated. You may now log in.',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset token';
      setErrorMsg(msg);
      toastError('Reset Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="default" padding="lg" className="border-2">
      {isSuccess ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-12 h-12 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black">
            <CheckCircle2 className="w-6 h-6 text-course-orange" />
          </div>
          <h2 className="text-2xl font-black text-course-darkBlue tracking-tight">
            Password Reset Successful
          </h2>
          <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
            Your password has been securely updated. You can now log in with your new credentials.
          </p>
          <div className="pt-4 border-t border-black">
            <Button
              variant="primary"
              className="w-full text-xs uppercase tracking-wide py-3"
              onClick={() => router.push('/login')}
            >
              Sign In Now
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <div className="w-10 h-10 bg-course-orange text-course-white inline-flex items-center justify-center border border-black mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-course-darkBlue tracking-tight">
              Set New Password
            </h1>
            <p className="text-xs text-course-navySubtle mt-1">
              Enter your reset token and your new strong password
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
              label="Reset Security Token"
              placeholder="Paste token from your email"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              helperText="Security token delivered to your inbox"
            />

            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 10 characters"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Must be at least 10 characters"
            />

            <Input
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full text-xs font-black uppercase tracking-wider py-3"
              isLoading={isLoading}
            >
              Reset Password
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-course-navyMuted">
            Remembered your password?{' '}
            <Link
              href="/login"
              className="font-bold text-course-darkBlue hover:text-course-orange underline min-h-[32px] inline-flex items-center"
            >
              Back to Sign In
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="p-8 text-center text-sm">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
