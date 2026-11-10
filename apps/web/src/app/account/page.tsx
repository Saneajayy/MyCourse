'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient, ApiError } from '../../lib/api-client';
import { formatDisplayOrderId } from '../../lib/order';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import {
  User as UserIcon,
  Laptop,
  Receipt,
  Download,
  AlertCircle,
  MailCheck,
  Loader2,
  Trash2,
  LogOut,
  Sparkles,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

interface SessionData {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

interface OrderHistoryItem {
  id: string;
  orderNumber?: string;
  status: string;
  amountPaise: number;
  currency: string;
  createdAt: string;
  product: {
    title: string;
    slug: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
}

function AccountNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Student Account Navigation"
        className="w-full h-20 md:h-[84px] flex items-stretch justify-between"
      >
        {/* Left Side: Brand Logo */}
        <div className="flex items-center pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24">
          <Link
            href="/"
            className="flex flex-col justify-center -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity shrink-0"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[19px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[19px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </div>

        {/* Right Side: Student Actions */}
        <div className="flex items-stretch shrink-0">
          {/* Admin Panel or My Courses Link */}
          {user?.role === 'ADMIN' ? (
            <Link
              href="/admin"
              className="figma-glass-divider h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 text-white hover:bg-white/10 transition-colors font-semibold text-xs sm:text-sm gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span>Admin Panel</span>
            </Link>
          ) : (
            <Link
              href="/my-courses"
              className="figma-glass-divider h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 text-white/90 hover:text-white hover:bg-white/10 transition-colors font-semibold text-xs sm:text-sm gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">My Courses</span>
            </Link>
          )}

          {/* Active Account Cell */}
          <div className="figma-glass-divider h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 text-[#0033FF] font-bold text-xs sm:text-sm bg-white gap-2">
            <UserIcon className="w-4 h-4 text-[#0033FF] stroke-[2.5]" />
            <span className="hidden sm:inline">
              {user?.name ? user.name.split(' ')[0] : 'Account'}
            </span>
          </div>

          {/* Logout Action Cell */}
          <div className="figma-glass-divider border-r border-white/20 h-full flex items-stretch">
            <button
              type="button"
              onClick={() => logout()}
              className="h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus:outline-none"
              title="Log out"
              aria-label="Log out"
            >
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser, logout } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'sessions' | 'orders'>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
      return;
    }
    if (user?.role === 'ADMIN') {
      router.replace('/admin/settings');
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Load Sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiClient<{ sessions: SessionData[] }>('/sessions');
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      if (
        (err instanceof ApiError && err.status === 401) ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes('session has been revoked') ||
            err.message.toLowerCase().includes('authentication token') ||
            err.message.toLowerCase().includes('unauthorized')))
      ) {
        await logout();
        router.push('/login?message=session-expired');
        return;
      }
      toastError('Failed to load sessions', err instanceof Error ? err.message : 'Error');
    } finally {
      setSessionsLoading(false);
    }
  }, [toastError, logout, router]);

  // Load Orders
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await apiClient<OrderHistoryItem[]>('/orders');
      setOrders(data);
    } catch (err: unknown) {
      if (
        (err instanceof ApiError && err.status === 401) ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes('session has been revoked') ||
            err.message.toLowerCase().includes('authentication token') ||
            err.message.toLowerCase().includes('unauthorized')))
      ) {
        await logout();
        router.push('/login?message=session-expired');
        return;
      }
      toastError('Failed to load orders', err instanceof Error ? err.message : 'Error');
    } finally {
      setOrdersLoading(false);
    }
  }, [toastError, logout, router]);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'sessions') {
        loadSessions();
      } else if (activeTab === 'orders') {
        loadOrders();
      }
    }
  }, [activeTab, isAuthenticated, loadSessions, loadOrders]);

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await apiClient('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      await refreshUser();
      toastSuccess('Profile Updated', 'Your student details were saved successfully.');
    } catch (err: unknown) {
      if (
        (err instanceof ApiError && err.status === 401) ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes('session has been revoked') ||
            err.message.toLowerCase().includes('authentication token') ||
            err.message.toLowerCase().includes('unauthorized')))
      ) {
        await logout();
        router.push('/login?message=session-expired');
        return;
      }
      toastError('Save Failed', err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 10) {
      setPasswordError('New password must be at least 10 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await apiClient('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toastSuccess('Password Changed', 'Password updated successfully. Please log in with your new password.');
      await logout();
      router.push('/login?message=password-changed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(msg);
      toastError('Password Change Failed', msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Resend Email Verification
  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await apiClient('/auth/resend-verification', { method: 'POST' });
      toastSuccess('Verification Sent', 'Please check your inbox for the link.');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Could not send verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  // Revoke Individual Session
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await apiClient(`/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toastSuccess('Session Revoked', 'Device has been logged out.');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Log Out Everywhere
  const handleLogoutEverywhere = async () => {
    setLoggingOutAll(true);
    try {
      await apiClient('/auth/logout-all', { method: 'POST' });
      toastSuccess('Logged Out Everywhere', 'All active sessions have been invalidated.');
      await logout();
      router.push('/login');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Failed to logout everywhere');
      setLoggingOutAll(false);
    }
  };

  if (user?.role === 'ADMIN') {
    return (
      <div className="bg-[#00186B] min-h-screen text-white font-reddit flex items-center justify-center">
        <div className="text-white text-sm font-bold flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Redirecting to Admin Settings...</span>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
        <div className="noise-texture" aria-hidden="true" />
        <AccountNavbar />
        <div className="w-full flex-1 flex flex-col items-center justify-center py-28 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <p className="text-sm font-semibold tracking-wider uppercase text-white/80">
            Loading Account Profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Floating Glass Navbar */}
      <AccountNavbar />

      {/* Main Student Portal Content - Aligned directly under the navbar logo */}
      <main className="relative z-10 flex-1 w-full py-8 sm:py-10 md:py-12 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        {/* Header Block: STUDENT ACCOUNT. */}
        <div className="mb-5 sm:mb-6 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-4xl sm:text-5xl md:text-6xl lg:text-[72px] select-none">
            <span className="block">STUDENT</span>
            <span className="block">ACCOUNT.</span>
          </h1>
        </div>

        {/* Sub-Navbar Under Title: Profile & Security, Active Devices, Order History */}
        <div className="flex items-center select-none mb-8 sm:mb-10">
          <div
            role="tablist"
            aria-label="Student Account Navigation"
            className="inline-flex items-stretch rounded-lg sm:rounded-xl overflow-hidden border border-white bg-transparent"
          >
            <button
              type="button"
              role="tab"
              id="tab-profile"
              aria-selected={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              className={`h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'profile'
                ? 'bg-white text-[#0033FF]'
                : 'bg-transparent text-white hover:bg-white/10 active:bg-white/20'
                }`}
            >
              <UserIcon className="w-4 h-4 shrink-0 -translate-x-1 sm:-translate-x-1.5" />
              <span>Profile</span>
            </button>

            {/* Vertical Partition Line */}
            <div className="w-px bg-white self-stretch shrink-0" aria-hidden="true" />

            <button
              type="button"
              role="tab"
              id="tab-sessions"
              aria-selected={activeTab === 'sessions'}
              onClick={() => setActiveTab('sessions')}
              className={`h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'sessions'
                ? 'bg-white text-[#0033FF]'
                : 'bg-transparent text-white hover:bg-white/10 active:bg-white/20'
                }`}
            >
              <Laptop className="w-4 h-4 shrink-0 -translate-x-1 sm:-translate-x-1.5" />
              <span>Devices</span>
            </button>

            {/* Vertical Partition Line */}
            <div className="w-px bg-white self-stretch shrink-0" aria-hidden="true" />

            <button
              type="button"
              role="tab"
              id="tab-orders"
              aria-selected={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              className={`h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'orders'
                ? 'bg-white text-[#0033FF]'
                : 'bg-transparent text-white hover:bg-white/10 active:bg-white/20'
                }`}
            >
              <Receipt className="w-4 h-4 shrink-0 -translate-x-1 sm:-translate-x-1.5" />
              <span>Orders</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Profile & Security */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            {/* Card 1: Profile Details - Smooth Plain White Card */}
            <div className="relative w-full bg-white rounded-lg sm:rounded-xl p-6 sm:p-8 select-none">
              {/* Card Content */}
              <div className="relative z-10 w-full text-neutral-900 space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0033FF] uppercase tracking-tight">
                    PROFILE DETAILS.
                  </h2>
                  <p className="text-xs text-neutral-500 font-medium mt-1">
                    Personal student credentials &amp; contact
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block font-mono">
                      Printed on course completion certificates
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full h-11 sm:h-12 px-3.5 bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-md sm:rounded-lg text-sm font-medium cursor-not-allowed font-mono"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block font-mono">
                      Primary email cannot be changed directly
                    </span>
                  </div>

                  {!user?.emailVerifiedAt && (
                    <div className="p-4 border border-amber-300 bg-amber-50 rounded-md sm:rounded-lg text-xs text-amber-950 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Your email address is not verified yet.</span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Verify your email to ensure uninterrupted course access and certificate issuance.
                      </p>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendingVerification}
                        className="w-full h-10 bg-white border border-amber-400 hover:bg-amber-100 active:bg-amber-200 text-amber-950 font-bold text-xs uppercase tracking-wider rounded-md cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        {resendingVerification ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MailCheck className="w-3.5 h-3.5 text-amber-800" />
                        )}
                        <span>Resend Verification Email</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block font-mono">
                      Used for transaction SMS and notifications
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-md sm:rounded-lg flex items-center justify-center transition-colors select-none gap-2 cursor-pointer"
                    >
                      {profileSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Profile Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Card 2: Change Password - Smooth Plain White Card */}
            <div className="relative w-full bg-white rounded-lg sm:rounded-xl p-6 sm:p-8 select-none">
              {/* Card Content */}
              <div className="relative z-10 w-full text-neutral-900 space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0033FF] uppercase tracking-tight">
                    CHANGE PASSWORD.
                  </h2>
                  <p className="text-xs text-neutral-500 font-medium mt-1">
                    Update your account security credentials
                  </p>
                </div>

                {passwordError && (
                  <div className="p-3.5 border border-rose-300 bg-rose-50 text-rose-950 text-xs font-bold rounded-md sm:rounded-lg">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                      Current Password <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                      New Password <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Min 10 characters"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block font-mono">
                      Must be at least 10 characters long
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                      Confirm New Password <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-md sm:rounded-lg flex items-center justify-center transition-colors select-none gap-2 cursor-pointer"
                    >
                      {passwordSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Active Devices & Streaming Sessions */}
        {activeTab === 'sessions' && (
          <div className="relative w-full bg-white rounded-lg sm:rounded-xl p-6 sm:p-8 select-none">
            {/* Card Content */}
            <div className="relative z-10 w-full text-neutral-900 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0033FF] uppercase tracking-tight">
                    ACTIVE SESSIONS.
                  </h2>
                  <p className="text-xs text-neutral-500 font-medium mt-1">
                    Single-stream playback enforced. Revoke any unrecognized devices.
                  </p>
                </div>

                {/* Log Out Everywhere Button for E2E Test Contract */}
                <button
                  type="button"
                  onClick={handleLogoutEverywhere}
                  disabled={loggingOutAll}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs uppercase tracking-wider rounded-md sm:rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                >
                  {loggingOutAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>Log Out Everywhere</span>
                </button>
              </div>

              {sessionsLoading ? (
                <div className="py-16 text-center text-sm font-semibold text-neutral-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0033FF]" />
                  <span>Loading active sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-16 text-center text-sm font-medium text-neutral-500">
                  No active session records found.
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-200 rounded-md sm:rounded-lg">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-neutral-50 text-neutral-700 uppercase font-bold text-[11px] border-b border-neutral-200">
                      <tr>
                        <th className="py-3.5 px-4">Device / Browser</th>
                        <th className="py-3.5 px-4">IP Address</th>
                        <th className="py-3.5 px-4">Last Active</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {sessions.map((sess) => (
                        <tr key={sess.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <Laptop className="w-4 h-4 text-[#0033FF] shrink-0" />
                              <div>
                                <div className="font-bold text-neutral-900 truncate max-w-xs">
                                  {sess.userAgent || 'Unknown Browser / Platform'}
                                </div>
                                {sess.isCurrent && (
                                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#0033FF] text-white">
                                    Current Session
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-600">
                            {sess.ipAddress || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-600">
                            {new Date(sess.lastUsedAt).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              disabled={revokingSessionId === sess.id}
                              onClick={() => handleRevokeSession(sess.id)}
                              className="text-xs font-bold uppercase tracking-wider py-1.5 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Order History & Tax Invoices */}
        {activeTab === 'orders' && (
          <div className="relative w-full bg-white rounded-lg sm:rounded-xl p-6 sm:p-8 select-none">
            {/* Card Content */}
            <div className="relative z-10 w-full text-neutral-900 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0033FF] uppercase tracking-tight">
                  PURCHASE &amp; INVOICES.
                </h2>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  Official GST tax invoices can be downloaded directly in PDF format for expense reimbursement.
                </p>
              </div>

              {ordersLoading ? (
                <div className="py-16 text-center text-sm font-semibold text-neutral-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0033FF]" />
                  <span>Loading orders and invoices...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center text-sm font-medium text-neutral-500 space-y-3">
                  <Receipt className="w-10 h-10 text-neutral-400 mx-auto" />
                  <p>No previous purchase records found.</p>
                  <Link
                    href="/#pricing"
                    className="inline-flex items-center justify-center h-10 px-6 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-sm transition-all gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Courses</span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-neutral-50 text-neutral-700 uppercase font-bold text-[11px] border-b border-neutral-200">
                      <tr>
                        <th className="py-3.5 px-4">Order ID</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Course</th>
                        <th className="py-3.5 px-4">Amount</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                            {formatDisplayOrderId(ord.orderNumber || ord.id)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-600">
                            {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-neutral-900">
                            {ord.product.title}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                            ₹{(ord.amountPaise / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded ${ord.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ord.status === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                                }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {ord.invoice ? (
                              <a
                                href={`${siteConfig.urls.api}/api/v1/invoices/${ord.invoice.id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold uppercase tracking-wider py-1.5 px-3 bg-[#0033FF] hover:bg-[#0028D6] text-white rounded-md transition-colors inline-flex items-center gap-1.5 shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF Invoice</span>
                              </a>
                            ) : (
                              <span className="text-neutral-400 font-mono text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
