'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient, ApiError } from '../../lib/api-client';
import { formatDisplayOrderId } from '../../lib/order';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import {
  BookOpen,
  Award,
  User as UserIcon,
  Laptop,
  Smartphone,
  Receipt,
  Search,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Download,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

export type DashboardTab = 'courses' | 'certificates' | 'profile' | 'devices' | 'orders';

interface EnrolledCourse {
  product: {
    id: string;
    slug: string;
    title: string;
    thumbnailUrl: string | null;
  };
  entitlement: {
    id: string;
    status: string;
    startsAt: string;
    expiresAt: string | null;
    remainingDays: number | null;
    isLifetime: boolean;
  };
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentComplete: number;
  };
  nextLesson?: {
    lessonId: string;
    title: string;
  } | null;
}

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

function formatExpiryDate(expiresAt: string | null | undefined, isLifetime?: boolean): string {
  if (isLifetime || !expiresAt) return 'LIFETIME ACCESS';
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return 'LIFETIME ACCESS';
  const day = d.getDate();
  const suffix = (n: number) => {
    if (n >= 11 && n <= 13) return 'th';
    switch (n % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };
  const monthNames = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  return `EXPIRES ON ${day}${suffix(day)} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCourseTitle(title?: string): string {
  if (!title) return 'UNTITLED COURSE.';
  const t = title.trim().toUpperCase();
  return t.endsWith('.') ? t : `${t}.`;
}

function CloseBarsProgressBar({ percent = 0 }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      className="w-full flex items-center h-[18px] sm:h-5 select-none my-3 sm:my-3.5 overflow-hidden"
      aria-label={`Course progress: ${clamped}%`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Completed portion with dense electric blue vertical bars */}
      {clamped > 0 && (
        <div
          className="h-full shrink-0"
          style={{
            width: clamped >= 100 ? '100%' : `calc(${clamped}% - 14px)`,
            minWidth: clamped > 0 && clamped < 100 ? '8px' : undefined,
            backgroundImage:
              'repeating-linear-gradient(to right, #0033FF 0px, #0033FF 1.5px, transparent 1.5px, transparent 4px)',
          }}
        />
      )}

      {/* Percentage Label */}
      <span
        className={`text-[#0033FF] font-medium text-[11px] sm:text-xs leading-none shrink-0 select-none ${
          clamped === 0 ? 'pr-1.5' : clamped === 100 ? 'pl-1.5' : 'px-1.5'
        }`}
      >
        {clamped}%
      </span>

      {/* Uncompleted portion with faint lavender-gray vertical bars */}
      {clamped < 100 && (
        <div
          className="flex-1 h-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, #DFE4FA 0px, #DFE4FA 1.5px, transparent 1.5px, transparent 4px)',
          }}
        />
      )}
    </div>
  );
}

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser, logout } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const tabParam = searchParams.get('tab') as DashboardTab | null;
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    tabParam && ['courses', 'certificates', 'profile', 'devices', 'orders'].includes(tabParam)
      ? tabParam
      : 'courses',
  );

  // Sync tab with URL query parameter
  const handleTabChange = (newTab: DashboardTab) => {
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  // Courses state
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/my-courses');
      return;
    }
    if (user?.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Sync user profile fields
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Fetch Courses
  const fetchMyCourses = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const res = await apiClient<EnrolledCourse[]>('/me/courses');
      setCourses(res);
    } catch (err: unknown) {
      if (
        (err instanceof ApiError && (err.status === 401 || err.status === 403)) ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes('authentication') ||
            err.message.toLowerCase().includes('token') ||
            err.message.toLowerCase().includes('session') ||
            err.message.toLowerCase().includes('unauthorized')))
      ) {
        await logout();
        router.push('/login?redirect=/my-courses&message=session-expired');
        return;
      }
      setCoursesError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setCoursesLoading(false);
    }
  }, [logout, router]);

  // Fetch Sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiClient<{ sessions: SessionData[] }>('/sessions');
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      toastError('Failed to load devices', err instanceof Error ? err.message : 'Error');
    } finally {
      setSessionsLoading(false);
    }
  }, [toastError]);

  // Fetch Orders
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await apiClient<OrderHistoryItem[]>('/orders');
      setOrders(data);
    } catch (err: unknown) {
      toastError('Failed to load orders', err instanceof Error ? err.message : 'Error');
    } finally {
      setOrdersLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyCourses();
    }
  }, [isAuthenticated, fetchMyCourses]);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'devices' && sessions.length === 0) {
        loadSessions();
      } else if (activeTab === 'orders' && orders.length === 0) {
        loadOrders();
      }
    }
  }, [activeTab, isAuthenticated, sessions.length, orders.length, loadSessions, loadOrders]);

  // Profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await apiClient('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      await refreshUser();
      toastSuccess('Profile Updated', 'Your profile details have been saved.');
    } catch (err: unknown) {
      toastError('Update Failed', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
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
      toastSuccess('Password Changed', 'Password updated successfully. Please log in again.');
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

  // Resend verification
  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await apiClient('/auth/resend-verification', { method: 'POST' });
      toastSuccess('Verification Sent', 'Please check your inbox for the code.');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Could not send verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await apiClient(`/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toastSuccess('Session Revoked', 'Device has been signed out.');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Logout all
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

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase().trim();
    return courses.filter(
      (c) =>
        c.product.title.toLowerCase().includes(q) ||
        c.product.slug.toLowerCase().includes(q),
    );
  }, [courses, searchQuery]);

  // Completed courses
  const completedCourses = useMemo(() => {
    return courses.filter((c) => (c.progress?.percentComplete ?? 0) >= 100);
  }, [courses]);

  if (authLoading || (coursesLoading && courses.length === 0)) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#0033FF] text-white font-reddit flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <p className="text-sm font-bold tracking-wider uppercase text-blue-200">
          Loading Student Portal...
        </p>
      </div>
    );
  }

  const navTabs: { id: DashboardTab; label: string }[] = [
    { id: 'courses', label: 'My Courses' },
    { id: 'certificates', label: 'My Certificates' },
    { id: 'profile', label: 'Profile' },
    { id: 'orders', label: 'Payment Orders' },
    { id: 'devices', label: 'Devices' },
  ];

  return (
    <div className="min-h-screen w-full bg-white font-reddit selection:bg-[#0033FF] selection:text-white flex flex-col md:flex-row">
      {/* ============================================================== */}
      {/* 1. LEFT BLUE COLUMN (Solid #0033FF, embedded image, clean tabs) */}
      {/* ============================================================== */}

      {/* Mobile Top Header + Horizontal Scroll Strip */}
      <div className="md:hidden w-full bg-[#0033FF] border-b border-white/50 select-none z-30 shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-25">
          <Image
            src="/login-pixelated.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center mix-blend-screen select-none"
          />
        </div>

        {/* Mobile Brand Logo Bar */}
        <div className="relative z-10 px-5 py-4 border-b border-white/50 flex items-center justify-between">
          <Link
            href="/"
            className="flex flex-col -space-y-0.5 leading-[0.92] text-white hover:opacity-90 select-none"
            aria-label="HYDRO BASICS Home - Back to Course"
          >
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </div>

        {/* Mobile Scrollable Tabs with Thin White Vertical Separators */}
        <nav
          aria-label="Student Mobile Tabs"
          className="relative z-10 flex items-stretch overflow-x-auto no-scrollbar"
        >
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-3 text-xs sm:text-sm font-bold border-r border-white/50 shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0033FF] font-extrabold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => logout()}
            className="px-4 py-3 text-xs sm:text-sm font-bold text-white shrink-0 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </nav>
      </div>

      {/* Desktop Sidebar: Solid Blue Column with Embedded Image & Contrasting Tabs */}
      <aside className="hidden md:flex md:fixed md:top-0 md:bottom-0 md:left-0 md:w-64 lg:w-72 bg-[#0033FF] text-white flex-col shrink-0 z-30 select-none border-r border-white/50 overflow-y-auto relative shadow-none">
        {/* Previous Image Embedded on Column Back (Not Glassy, Clean Halftone) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <Image
            src="/login-pixelated.png"
            alt="Hydraulic System Graphic"
            fill
            sizes="300px"
            priority
            className="object-cover object-center mix-blend-screen opacity-35 select-none"
          />
        </div>

        {/* Top: Brand Logo with Bottom Dividing Line */}
        <div className="relative z-10 w-full px-6 sm:px-7 py-6 sm:py-7 border-b border-white/50">
          <Link
            href="/"
            className="flex flex-col -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity select-none"
            aria-label="HYDRO BASICS Home - Back to Course"
          >
            <span className="font-extrabold text-[22px] sm:text-[24px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[22px] sm:text-[24px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </div>

        {/* Navigation Tabs with Thin White Dividing Borders & Contrasting Active Tab */}
        <nav aria-label="Student Dashboard Navigation" className="relative z-10 flex flex-col w-full">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`w-full text-left px-6 sm:px-7 py-4.5 sm:py-5 text-[15px] sm:text-[16px] font-bold border-b border-white/50 transition-colors cursor-pointer select-none ${
                  isActive
                    ? 'bg-white text-[#0033FF] font-extrabold'
                    : 'bg-transparent text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Log Out Tab Button */}
          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-left px-6 sm:px-7 py-4.5 sm:py-5 text-[15px] sm:text-[16px] font-bold text-white border-b border-white/50 hover:bg-white/10 active:bg-rose-500/20 transition-colors cursor-pointer select-none"
          >
            Log Out
          </button>

          {/* Admin Switch Link (visible only for admins) */}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="w-full text-left px-6 sm:px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-200 border-b border-white/50 hover:bg-white/10 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* Empty Solid Blue Column Continuing Down */}
        <div className="flex-1 w-full" />
      </aside>

      {/* ============================================================== */}
      {/* 2. RIGHT WHITE WORKSPACE (Left-aligned, Zero Shadows)          */}
      {/* ============================================================== */}
      <main className="flex-1 md:pl-64 lg:pl-72 w-full min-h-screen bg-white flex flex-col">
        <div className="w-full max-w-4xl p-6 sm:p-8 lg:p-10 space-y-6 text-left">

          {/* TAB 1: MY COURSES */}
          {activeTab === 'courses' && (
            <div className="space-y-6 text-left">
              {/* Header Title & Subtitle */}
              <div className="text-left">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  My Courses
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Continue learning and master industrial hydraulic systems.
                </p>
              </div>

              {/* Minimal Search Bar directly below Title */}
              {courses.length > 0 && (
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 bg-white border border-neutral-300 rounded-lg text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:outline-none transition-all shadow-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Error Notice */}
              {coursesError && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{coursesError}</span>
                </div>
              )}

              {/* Empty State: No Courses Enrolled */}
              {courses.length === 0 && !coursesError && (
                <div className="bg-white border border-neutral-200 rounded-xl p-8 sm:p-10 text-left space-y-4 max-w-md shadow-none">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0033FF] flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-neutral-900">NO ACTIVE COURSES.</h2>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      You are not currently enrolled in any courses. Explore our masterclass to start learning.
                    </p>
                  </div>
                  <div>
                    <Link
                      href="/#pricing"
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-none"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Explore Masterclass</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Empty Search Filter State */}
              {courses.length > 0 && filteredCourses.length === 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl p-6 text-left space-y-2 shadow-none max-w-md">
                  <p className="text-sm font-bold text-neutral-800">
                    No courses match &ldquo;{searchQuery}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-[#0033FF] hover:underline cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              )}

              {/* Courses Grid: Minimal White Cards with Minimal Text and Previous Progress Bar */}
              {filteredCourses.length > 0 && (
                <div className="flex flex-wrap gap-6 items-start text-left">
                  {filteredCourses.map((c) => {
                    const percent = Math.min(100, Math.max(0, Math.round(c.progress?.percentComplete ?? 0)));

                    return (
                      <div
                        key={c.product.id}
                        className="relative w-full max-w-[420px] sm:max-w-[450px] bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-none select-none flex flex-col justify-between"
                      >
                        <div className="w-full flex flex-col">
                          {/* Expiration Date Header - Minimal text like before, NO pills */}
                          <div className="mb-2 sm:mb-2.5">
                            <span className="text-[#0033FF] text-[11px] sm:text-[12px] font-medium tracking-wider uppercase select-none block">
                              {formatExpiryDate(c.entitlement?.expiresAt, c.entitlement?.isLifetime)}
                            </span>
                          </div>

                          {/* Course Thumbnail Image */}
                          <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden mb-3 sm:mb-3.5 select-none bg-neutral-100 border border-neutral-100">
                            <img
                              src="/course.jpg"
                              alt={c.product.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/course-hydraulic-basics.jpg';
                              }}
                              className="w-full h-full object-cover select-none"
                            />
                          </div>

                          {/* Course Title: HYDRAULIC SYSTEM BASICS. */}
                          <h2 className="font-extrabold text-[#0033FF] uppercase text-[20px] sm:text-[22px] md:text-[23px] tracking-tight leading-tight select-none">
                            {formatCourseTitle(c.product.title)}
                          </h2>

                          {/* Progress Bar with Close Vertical Bars and Percentage Label (Previous Design) */}
                          <CloseBarsProgressBar percent={percent} />

                          {/* Full-Width Solid Blue Continue Learning Action Button - No Arrow, Shadow-none */}
                          <Link
                            href={`/learn/${c.product.slug}`}
                            className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-lg flex items-center justify-center transition-colors select-none shadow-none"
                          >
                            <span>CONTINUE LEARNING</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="space-y-6 text-left">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  My Certificates
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Official verifiable certificates of completion signed by instructor HiraLal.
                </p>
              </div>

              {completedCourses.length === 0 ? (
                <div className="bg-white border border-neutral-200 rounded-xl p-8 text-left space-y-4 max-w-md shadow-none">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0033FF] flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-neutral-900">No Certificates Earned Yet</h2>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Complete all lesson modules and practical evaluations in your enrolled courses to automatically unlock your verified certificate.
                    </p>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleTabChange('courses')}
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-none cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Go to My Courses</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  {completedCourses.map((c) => (
                    <div
                      key={c.product.id}
                      className="bg-white border border-neutral-200 rounded-xl p-6 shadow-none space-y-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                            Course Completed
                          </span>
                          <h2 className="text-base font-bold text-neutral-900 truncate">
                            {c.product.title}
                          </h2>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                        <p><strong className="text-neutral-900">Credential:</strong> Verified Certificate of Completion</p>
                        <p><strong className="text-neutral-900">Instructor:</strong> HiraLal</p>
                      </div>

                      <Link
                        href={`/learn/${c.product.slug}`}
                        className="w-full h-10 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-none"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Certificate</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 text-left">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Profile &amp; Account
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Manage your personal details, email verification, and security credentials.
                </p>
              </div>

              {/* Personal Details Card */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-7 shadow-none space-y-5 text-left max-w-xl">
                <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-200">
                  <UserIcon className="w-4 h-4 text-[#0033FF]" />
                  <h2 className="text-base font-bold text-neutral-900">Personal Information</h2>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full h-10 px-3.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none transition-all shadow-none"
                    />
                  </div>

                  {/* Email & Verification */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                        Email Address
                      </label>
                      {user?.emailVerifiedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                          <span>Unverified</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full h-10 px-3.5 bg-neutral-100 border border-neutral-200 rounded-lg text-sm text-neutral-600 cursor-not-allowed select-none shadow-none"
                    />
                    {!user?.emailVerifiedAt && (
                      <div className="flex items-center gap-3 pt-1">
                        <Link
                          href={`/verify-email?email=${encodeURIComponent(user?.email || '')}`}
                          className="text-xs font-bold text-[#0033FF] hover:underline"
                        >
                          Enter 6-digit OTP &rarr;
                        </Link>
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resendingVerification}
                          className="text-xs font-bold text-neutral-600 hover:text-black underline cursor-pointer disabled:opacity-50"
                        >
                          {resendingVerification ? 'Sending...' : 'Resend OTP'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-10 px-3.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none transition-all shadow-none"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="h-10 px-5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {profileSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Change Password Card */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-7 shadow-none space-y-5 text-left max-w-xl">
                <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-200">
                  <Lock className="w-4 h-4 text-[#0033FF]" />
                  <h2 className="text-base font-bold text-neutral-900">Security &amp; Password</h2>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                      {passwordError}
                    </div>
                  )}

                  {/* Current Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full h-10 px-3.5 pr-10 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none transition-all shadow-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                        aria-label="Toggle password visibility"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="At least 8 characters"
                        className="w-full h-10 px-3.5 pr-10 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none transition-all shadow-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                        aria-label="Toggle password visibility"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat new password"
                      className="w-full h-10 px-3.5 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:border-[#0033FF] focus:outline-none transition-all shadow-none"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="h-10 px-5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {passwordSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                    Logged-in Devices
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                    Manage your active browser sessions across desktop, tablet, and mobile devices.
                  </p>
                </div>

                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleLogoutEverywhere}
                    disabled={loggingOutAll}
                    className="h-9 px-3.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-60 shrink-0 shadow-none"
                  >
                    {loggingOutAll ? 'Signing out...' : 'Sign Out Other Devices'}
                  </button>
                )}
              </div>

              {sessionsLoading ? (
                <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center text-sm font-semibold text-neutral-500 flex flex-col items-center justify-center gap-3 shadow-none">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0033FF]" />
                  <span>Loading active sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="bg-white border border-neutral-200 rounded-xl p-6 text-left text-sm text-neutral-500 shadow-none">
                  No active session information available.
                </div>
              ) : (
                <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200 shadow-none overflow-hidden max-w-2xl text-left">
                  {sessions.map((sess) => {
                    const isMobile = sess.userAgent?.toLowerCase().includes('mobile');
                    return (
                      <div key={sess.id} className="p-4 sm:p-4.5 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0033FF] flex items-center justify-center shrink-0 border border-blue-100">
                            {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-neutral-900 truncate">
                                {sess.userAgent || 'Web Browser'}
                              </p>
                              {sess.isCurrent && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5 truncate">
                              IP: {sess.ipAddress || 'Hidden'} • Active {new Date(sess.lastUsedAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>

                        {!sess.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(sess.id)}
                            disabled={revokingSessionId === sess.id}
                            className="h-8 px-3 rounded border border-neutral-200 hover:border-rose-300 hover:bg-rose-50 text-neutral-600 hover:text-rose-700 font-bold text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            {revokingSessionId === sess.id ? 'Revoking...' : 'Sign Out'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PAYMENT ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6 text-left">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Payment Orders &amp; Invoices
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Download official GST tax invoices in PDF format for company or personal reimbursement.
                </p>
              </div>

              {ordersLoading ? (
                <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center text-sm font-semibold text-neutral-500 flex flex-col items-center justify-center gap-3 shadow-none">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0033FF]" />
                  <span>Loading payment orders...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white border border-neutral-200 rounded-xl p-8 text-left space-y-4 max-w-md shadow-none">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0033FF] flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-neutral-900">No Previous Orders</h2>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      You haven&apos;t made any course purchases yet.
                    </p>
                  </div>
                  <div>
                    <Link
                      href="/#pricing"
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-none"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>View Courses</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-none max-w-4xl text-left">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-neutral-50 text-neutral-600 uppercase font-bold text-[11px] border-b border-neutral-200">
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
                          <tr key={ord.id} className="hover:bg-neutral-50 transition-colors">
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
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${ord.status === 'PAID'
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
                                  className="text-xs font-bold py-1.5 px-3 bg-[#0033FF] hover:bg-[#0028D6] text-white rounded-md transition-colors inline-flex items-center gap-1.5 shadow-none"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>PDF</span>
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
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function MyCoursesPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 w-full h-full bg-[#0033FF] text-white font-reddit flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <p className="text-sm font-bold tracking-wider uppercase text-blue-200">
            Loading Student Portal...
          </p>
        </div>
      }
    >
      <StudentDashboardContent />
    </Suspense>
  );
}
