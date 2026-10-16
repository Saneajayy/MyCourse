'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Button, Input, Card, useToast } from '../../components/ui';
import { siteConfig } from '../../config/site';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRequestId(null);

    if (password.length < 10) {
      setErrorMsg('Password must be at least 10 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password, phone || undefined);
      setIsSuccess(true);
      toastSuccess('Account Registered', 'Verification link sent to your email.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setErrorMsg(message);
      if (err && typeof err === 'object' && 'requestId' in err) {
        setRequestId((err as { requestId?: string }).requestId || null);
      }
      toastError('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16 bg-course-white">
      <div className="w-full max-w-md">
        <Card variant="default" padding="lg" className="border-2">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black">
                <CheckCircle2 className="w-6 h-6 text-course-orange" />
              </div>
              <h2 className="text-2xl font-black text-course-darkBlue tracking-tight">
                Check Your Email
              </h2>
              <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
                We sent a secure verification link to{' '}
                <strong className="text-course-darkBlue">{email}</strong>. Please click the link in
                the email to activate your account.
              </p>
              <div className="pt-4 border-t border-black flex flex-col gap-3">
                <Button
                  variant="primary"
                  className="w-full text-xs uppercase tracking-wide"
                  onClick={() => router.push('/login')}
                >
                  Proceed to Login
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-10 h-10 bg-course-orange text-course-white inline-flex items-center justify-center border border-black mb-3">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black text-course-darkBlue tracking-tight">
                  Create Student Account
                </h1>
                <p className="text-xs text-course-navySubtle mt-1">
                  Start your industrial hydraulics training
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 border border-black bg-rose-50 text-rose-950 text-xs">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  {requestId && (
                    <p className="font-mono text-[10px] text-course-navySubtle mt-1">
                      Ref ID: {requestId}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Ramesh Kumar"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  helperText="Name printed on your course completion certificate"
                />

                <Input
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  placeholder="engineer@plant.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Minimum 10 characters with numbers and symbols"
                />

                <Input
                  label="Phone Number (Optional)"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  helperText="Used for order confirmation & SMS alerts"
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-black uppercase tracking-wider py-3"
                  isLoading={isLoading}
                >
                  Create Account
                </Button>
              </form>

              {/* Social Login */}
              <div className="mt-8 pt-6 border-t border-black text-center space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-course-navyMuted">
                  Or Sign Up With
                </div>
                <a
                  href={`${siteConfig.urls.api}/api/v1/auth/google`}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 border border-black bg-course-white text-course-darkBlue hover:bg-course-orangeSubtle font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Register With Google</span>
                </a>
              </div>

              <div className="mt-6 text-center text-xs text-course-navyMuted">
                Already registered?{' '}
                <Link
                  href="/login"
                  className="font-bold text-course-darkBlue hover:text-course-orange underline min-h-[32px] inline-flex items-center"
                >
                  Sign In Instead
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
