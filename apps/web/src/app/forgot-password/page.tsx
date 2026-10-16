'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Card, useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });

      setIsSubmitted(true);
      toastSuccess(
        'Request Received',
        'If an account exists for this email, reset instructions have been sent.',
      );
    } catch (err: unknown) {
      toastError('Request Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-md">
        <Card variant="default" padding="lg" className="border-2">
          {isSubmitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black">
                <CheckCircle2 className="w-6 h-6 text-course-orange" />
              </div>
              <h2 className="text-2xl font-black text-course-darkBlue tracking-tight">
                Reset Instructions Sent
              </h2>
              <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
                If an account exists with <strong className="text-course-darkBlue">{email}</strong>,
                we have sent a secure password reset link. Please check your inbox and spam folder.
              </p>
              <div className="pt-4 border-t border-black">
                <Link
                  href="/login"
                  className="btn-primary block text-center text-xs uppercase tracking-wide py-3"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-10 h-10 bg-course-orange text-course-white inline-flex items-center justify-center border border-black mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black text-course-darkBlue tracking-tight">
                  Forgot Password?
                </h1>
                <p className="text-xs text-course-navySubtle mt-1">
                  Enter your registered email address to receive reset instructions
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Registered Email"
                  type="email"
                  autoComplete="email"
                  placeholder="engineer@plant.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-black uppercase tracking-wider py-3"
                  isLoading={isLoading}
                >
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-course-darkBlue hover:text-course-orange min-h-[32px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
