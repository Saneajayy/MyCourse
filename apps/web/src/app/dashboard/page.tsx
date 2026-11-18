'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient, ApiError } from '../../lib/api-client';
import { formatDisplayOrderId } from '../../lib/order';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import {
  BookOpen,
  User as UserIcon,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Download,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Video,
  Clock,
  ArrowLeft,
  Award,
  LogOut,
  Sigma,
} from 'lucide-react';
import { HydraulicCalculator } from '../../components/calculator/HydraulicCalculator';

export type DashboardTab = 'courses' | 'certificates' | 'calculator' | 'profile' | 'orders';

interface EnrolledCourse {
  product: {
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    thumbnailUrl: string | null;
    totalVideos?: number;
    totalDurationSeconds?: number;
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
    totalDurationSeconds?: number;
  };
  nextLesson?: {
    lessonId: string;
    title: string;
  } | null;
}

function formatCourseDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '5 Hours of Content';
  const hrs = seconds / 3600;
  const rounded = hrs >= 10 ? Math.round(hrs) : Math.round(hrs * 10) / 10;
  const isWhole = rounded % 1 === 0;
  const numStr = isWhole ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${numStr} ${rounded === 1 ? 'Hour' : 'Hours'} of Content`;
}

interface OrderHistoryItem {
  id: string;
  orderNumber?: string;
  status: string;
  totalPaise?: number;
  amountPaise?: number;
  subtotalPaise?: number;
  currency: string;
  createdAt: string;
  product: {
    title: string;
    slug: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalPaise?: number;
  } | null;
  payments?: Array<{
    id: string;
    amountPaise: number;
    status: string;
  }>;
}

function CloseBarsProgressBar({ percent = 0 }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      className="w-full flex items-center h-5 select-none mb-3 overflow-hidden"
      aria-label={`Course progress: ${clamped}%`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Completed portion with dense black vertical bars */}
      {clamped > 0 && (
        <div
          className="h-full shrink-0"
          style={{
            width: clamped >= 100 ? '100%' : `calc(${clamped}% - 14px)`,
            minWidth: clamped > 0 && clamped < 100 ? '8px' : undefined,
            backgroundImage:
              'repeating-linear-gradient(to right, #000000 0px, #000000 1.5px, transparent 1.5px, transparent 3.5px)',
          }}
        />
      )}

      {/* Percentage Label */}
      <span
        className={`text-black font-semibold text-xs sm:text-[13px] leading-none shrink-0 select-none ${
          clamped === 0 ? 'pr-2' : clamped === 100 ? 'pl-2' : 'px-2'
        }`}
      >
        {clamped}%
      </span>

      {/* Uncompleted portion with faint light-gray vertical bars */}
      {clamped < 100 && (
        <div
          className="flex-1 h-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, #D4D4D4 0px, #D4D4D4 1.5px, transparent 1.5px, transparent 3.5px)',
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
    tabParam && ['courses', 'certificates', 'calculator', 'profile', 'orders'].includes(tabParam)
      ? tabParam
      : 'courses',
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const tabRefs = useRef<{ [key in DashboardTab]?: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({
    top: 0,
    height: 0,
    opacity: 0,
  });

  // Courses state
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync tab with URL query parameter
  const handleTabChange = (newTab: DashboardTab) => {
    setActiveTab(newTab);
    setIsMobileMenuOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  // Smoothly move highlight pill to active tab
  const updateIndicator = useCallback(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setIndicatorStyle({
        top: activeEl.offsetTop,
        height: activeEl.offsetHeight,
        opacity: 1,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [updateIndicator, coursesLoading, authLoading]);

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard');
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
        router.push('/login?redirect=/dashboard&message=session-expired');
        return;
      }
      setCoursesError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setCoursesLoading(false);
    }
  }, [logout, router]);

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
      if (activeTab === 'orders' && orders.length === 0) {
        loadOrders();
      }
    }
  }, [activeTab, isAuthenticated, orders.length, loadOrders]);

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

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase().trim();
    return courses.filter(
      (c) => c.product.title.toLowerCase().includes(q) || c.product.slug.toLowerCase().includes(q),
    );
  }, [courses, searchQuery]);

  // Completed courses eligible for certificate (unlocks at >= 90%)
  const completedCourses = useMemo(() => {
    return courses.filter((c) => (c.progress?.percentComplete ?? 0) >= 90);
  }, [courses]);

  const navTabs: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  }[] = [
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'certificates', label: 'My Certificates', icon: Award },
    { id: 'calculator', label: 'Calculator', icon: Sigma },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'orders', label: 'Payment Orders', icon: Clock },
  ];

  const activeTabConfig = navTabs.find((t) => t.id === activeTab) ?? navTabs[0]!;
  const ActiveIcon = activeTabConfig.icon;
  const activeTabLabel = activeTabConfig.label;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit select-none z-10 flex flex-col md:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* 1. LEFT CARD: NAVIGATION TABS                                  */}
      {/* ============================================================== */}
      <aside className="w-full shrink-0 md:flex-none md:w-72 lg:w-80 md:h-full md:shrink-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden">
        {/* Top Header: Brand Logo HYDRO BASICS + Back / Home Link + Mobile Sandwich Button */}
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
          <Link href="/" className="flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-[#c2c4cc]/70 hover:text-white transition-colors"
              title="Back to Home"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Home</span>
            </Link>

            {/* Sandwich Toggle Button on right of Home (Mobile only) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden w-8 h-8 relative flex items-center justify-center text-[#c2c4cc] hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer select-none"
            >
              <Menu
                className={`w-4 h-4 stroke-[2.2] absolute transition-all duration-200 ${
                  isMobileMenuOpen
                    ? 'opacity-0 rotate-90 scale-75'
                    : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                className={`w-4 h-4 stroke-[2.2] absolute transition-all duration-200 ${
                  isMobileMenuOpen
                    ? 'opacity-100 rotate-0 scale-100'
                    : 'opacity-0 -rotate-90 scale-75'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Thin Stroke Separation Line */}
        <div className="border-b border-white/[0.08] w-full shrink-0" />

        {/* Mobile Expandable Tabs Stack (Sandwich Dropdown) */}
        <div
          className={`md:hidden grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
            isMobileMenuOpen
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <nav
              aria-label="Student Navigation Mobile"
              className="flex flex-col px-3 py-2 space-y-1"
            >
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl transition-colors text-left cursor-pointer select-none ${
                      isActive
                        ? 'bg-[#1f2023] text-white font-semibold'
                        : 'text-[#c2c4cc] hover:text-white hover:bg-white/[0.04] font-normal'
                    }`}
                  >
                    <Icon
                      strokeWidth={1}
                      className={`w-4 h-4 shrink-0 stroke-1 transition-colors ${isActive ? 'text-white' : 'text-[#c2c4cc]'}`}
                    />
                    <span
                      className={`transition-colors ${isActive ? 'text-white font-semibold' : 'text-[#c2c4cc] font-normal'}`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl text-emerald-400 hover:bg-emerald-500/10 font-normal transition-colors cursor-pointer select-none"
                >
                  <ShieldCheck
                    strokeWidth={1}
                    className="w-4 h-4 shrink-0 stroke-1 text-emerald-400"
                  />
                  <span>Admin Console</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl text-[#c2c4cc] hover:text-rose-400 hover:bg-white/[0.04] font-normal transition-colors cursor-pointer select-none text-left"
              >
                <LogOut strokeWidth={1} className="w-4 h-4 shrink-0 stroke-1 text-[#c2c4cc]" />
                <span className="text-[#c2c4cc]">Log Out</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Desktop Vertical Tabs Stack with Smooth Sliding Highlight Pill */}
        <nav
          aria-label="Student Navigation Desktop"
          className="relative hidden md:flex flex-1 flex-col overflow-y-auto custom-scrollbar px-2.5 py-3 space-y-1"
        >
          {/* Smooth Sliding Highlight Pill (TUF #1f2023) */}
          {indicatorStyle.opacity > 0 && (
            <div
              className="absolute left-2.5 right-2.5 rounded-xl bg-[#1f2023] pointer-events-none transition-[top,height,opacity] duration-200 ease-out z-0"
              style={{
                top: indicatorStyle.top,
                height: indicatorStyle.height,
              }}
            />
          )}

          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                  if (el && tab.id === activeTab && indicatorStyle.opacity === 0) {
                    setIndicatorStyle({
                      top: el.offsetTop,
                      height: el.offsetHeight,
                      opacity: 1,
                    });
                  }
                }}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`relative z-10 w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl transition-colors text-left cursor-pointer select-none group ${
                  isActive
                    ? indicatorStyle.opacity > 0
                      ? 'text-white font-semibold'
                      : 'bg-[#1f2023] text-white font-semibold'
                    : 'text-[#c2c4cc] hover:text-white hover:bg-white/[0.04] font-normal'
                }`}
              >
                <Icon
                  strokeWidth={1}
                  className={`w-4 h-4 shrink-0 stroke-1 transition-colors ${
                    isActive ? 'text-white' : 'text-[#c2c4cc] group-hover:text-white'
                  }`}
                />
                <span
                  className={`truncate transition-colors ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-[#c2c4cc] font-normal group-hover:text-white'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="relative z-10 w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl transition-colors text-left font-normal text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer select-none group"
            >
              <ShieldCheck
                strokeWidth={1}
                className="w-4 h-4 shrink-0 stroke-1 text-emerald-400 transition-colors"
              />
              <span className="truncate">Admin Console</span>
            </Link>
          )}

          {/* Log Out Button: Last in the stack */}
          <button
            type="button"
            onClick={() => logout()}
            className="relative z-10 w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-[13px] rounded-xl transition-colors text-left font-normal text-[#c2c4cc] hover:text-rose-400 hover:bg-white/[0.04] cursor-pointer select-none group"
          >
            <LogOut
              strokeWidth={1}
              className="w-4 h-4 shrink-0 stroke-1 text-[#c2c4cc] group-hover:text-rose-400 transition-colors"
            />
            <span className="truncate transition-colors text-[#c2c4cc] group-hover:text-rose-400">
              Log Out
            </span>
          </button>
        </nav>
      </aside>

      {/* ============================================================== */}
      {/* 2. RIGHT CARD: WORKSPACE CONTENT                              */}
      {/* ============================================================== */}
      <main className="w-full flex-1 min-h-0 md:h-full md:min-w-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden relative">
        {/* Top Header Bar: Active Tab Title & User Status */}
        <div className="h-12 px-5 sm:px-6 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#101012]">
          <div className="flex items-center gap-2.5 min-w-0">
            <ActiveIcon strokeWidth={1} className="w-4 h-4 stroke-1 text-white/60 shrink-0" />
            <h1 className="text-sm sm:text-[15px] font-bold text-white truncate">
              {activeTabLabel}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-block text-[11px] font-mono text-[#c2c4cc]/50">
              Student Dashboard
            </span>
          </div>
        </div>

        {/* Scrollable Tab Content Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7 md:p-8">
          <div className="w-full max-w-5xl space-y-6 text-left">
            {/* TAB 1: MY COURSES */}
            {activeTab === 'courses' && (
              <div className="space-y-6 text-left">
                {/* Header Title & Subtitle */}
                <div className="text-left">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    My Courses
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Continue learning and master industrial hydraulic systems.
                  </p>
                </div>

                {/* Minimal Search Bar directly below Title */}
                {courses.length > 0 && (
                  <div className="relative w-full max-w-md">
                    <input
                      type="text"
                      placeholder="Search courses"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 px-3.5 bg-white border border-neutral-300 rounded-none text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none transition-all shadow-none"
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
                  <div className="p-4 rounded-none bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{coursesError}</span>
                  </div>
                )}

                {/* Courses Loading Skeleton */}
                {(coursesLoading || authLoading) && courses.length === 0 ? (
                  <div className="w-full max-w-4xl bg-white/5 border border-white/[0.08] rounded-xl p-5 flex flex-col md:flex-row gap-5 animate-pulse select-none">
                    <div className="w-full md:w-[320px] lg:w-[360px] aspect-[16/10] bg-white/10 rounded-lg shrink-0" />
                    <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
                      <div className="space-y-2.5">
                        <div className="h-6 w-3/5 bg-white/10 rounded" />
                        <div className="h-4 w-full bg-white/5 rounded" />
                        <div className="h-4 w-4/5 bg-white/5 rounded" />
                      </div>
                      <div className="h-4 w-44 bg-white/5 rounded" />
                      <div className="h-10 w-48 bg-white/10 rounded" />
                    </div>
                  </div>
                ) : courses.length === 0 && !coursesError ? (
                  <div className="bg-white border border-neutral-200 rounded-none p-8 sm:p-10 text-left space-y-4 max-w-md shadow-none">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-neutral-900 uppercase">
                        NO ACTIVE COURSES.
                      </h2>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        You are not currently enrolled in any courses. Explore our masterclass to
                        start learning.
                      </p>
                    </div>
                    <div>
                      <Link
                        href="/#pricing"
                        className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-black hover:bg-[#262626] text-white font-bold text-xs uppercase tracking-wider rounded-none transition-colors shadow-none"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Explore Masterclass</span>
                      </Link>
                    </div>
                  </div>
                ) : null}

                {/* Empty Search Filter State */}
                {courses.length > 0 && filteredCourses.length === 0 && (
                  <div className="bg-white border border-neutral-200 rounded-none p-6 text-left space-y-2 shadow-none max-w-md">
                    <p className="text-sm font-bold text-neutral-800">
                      No courses match &ldquo;{searchQuery}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-bold text-black hover:underline cursor-pointer"
                    >
                      Clear Search
                    </button>
                  </div>
                )}

                {/* Courses List: Wide Horizontal Course Cards matching design */}
                {filteredCourses.length > 0 && (
                  <div className="w-full flex flex-col gap-6 items-start text-left">
                    {filteredCourses.map((c) => {
                      const percent = Math.min(
                        100,
                        Math.max(0, Math.round(c.progress?.percentComplete ?? 0)),
                      );
                      const totalVideos = c.product.totalVideos ?? c.progress?.totalLessons ?? 16;
                      const durationSeconds =
                        c.product.totalDurationSeconds ?? c.progress?.totalDurationSeconds ?? 17830;
                      const durationText = formatCourseDuration(durationSeconds);

                      return (
                        <div
                          key={c.product.id}
                          className="w-full max-w-4xl bg-white border border-neutral-300 rounded-none p-4 sm:p-5 flex flex-col md:flex-row gap-5 lg:gap-6 shadow-none select-none"
                        >
                          {/* Course Thumbnail Image: Desaturated Halftone Dot Effect */}
                          <div className="relative w-full md:w-[320px] lg:w-[360px] shrink-0 aspect-[16/10] rounded-none overflow-hidden bg-black border border-neutral-200">
                            <img
                              src={
                                c.product.thumbnailUrl &&
                                !c.product.thumbnailUrl.includes('unsplash')
                                  ? c.product.thumbnailUrl
                                  : '/course-halftone.jpg'
                              }
                              alt={c.product.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/course.jpg';
                              }}
                              className="w-full h-full object-cover select-none"
                            />
                          </div>

                          {/* Course Content Details */}
                          <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                            <div>
                              {/* Course Title + Active Status Badge */}
                              <div className="flex items-start justify-between gap-3">
                                <h2 className="text-xl sm:text-[22px] font-bold text-neutral-900 tracking-tight leading-snug">
                                  <Link
                                    href={`/learn/${c.product.slug}`}
                                    className="underline underline-offset-4 decoration-neutral-900 hover:text-neutral-700 transition-colors"
                                  >
                                    {c.product.title}
                                  </Link>
                                </h2>
                                <span className="px-2.5 py-0.5 sm:py-1 text-[11px] font-bold tracking-wider uppercase text-white bg-[#0e5c2f] rounded-none shrink-0 select-none">
                                  {c.entitlement?.status || 'ACTIVE'}
                                </span>
                              </div>

                              {/* Dynamic Course Description */}
                              <p className="text-xs sm:text-[13px] text-neutral-700 leading-relaxed mt-2 sm:mt-2.5 text-justify">
                                {c.product.description ||
                                  'Learn the fundamentals of hydraulic systems from scratch. This course introduces you to the working principles of hydraulics, essential components, and hydraulic circuit basics through easy-to-understand video lessons.'}
                              </p>
                            </div>

                            {/* 2. Course Metadata: Total Videos & Total Hours of Content (Centered evenly between Description and Progress Bar) */}
                            <div className="flex items-center gap-2.5 text-xs text-neutral-500 font-medium select-none py-3 sm:py-3.5">
                              <span className="inline-flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{totalVideos} Videos</span>
                              </span>
                              <span className="text-neutral-300">•</span>
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{durationText}</span>
                              </span>
                            </div>

                            {/* 3. Progress Bar, Certificate Unlock Notice & Action Buttons */}
                            <div>
                              {/* Barcode / Hatch Progress Bar with dynamic percentage */}
                              <CloseBarsProgressBar percent={percent} />

                              {/* Dynamic Certificate Unlock Notice */}
                              <p className="font-bold text-neutral-900 text-xs sm:text-[13px] select-none mt-2">
                                {percent >= 90
                                  ? 'Course completed. Certificate unlocked!'
                                  : 'Complete course to unlock certificate.'}
                              </p>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-3 mt-3.5 sm:mt-4">
                                <Link
                                  href={`/learn/${c.product.slug}`}
                                  aria-label={percent > 0 ? 'Continue Learning' : 'Start Learning'}
                                  className="h-10 px-6 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-medium text-xs sm:text-sm rounded-none flex items-center justify-center gap-1.5 transition-colors select-none shadow-none"
                                >
                                  <span>
                                    {percent > 0
                                      ? percent >= 90
                                        ? 'Review Course'
                                        : 'Continue Learning'
                                      : 'Start Learning'}{' '}
                                    &rarr;
                                  </span>
                                </Link>
                                <Link
                                  href={`/learn/${c.product.slug}`}
                                  className="h-10 px-6 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 border border-neutral-900 font-medium text-xs sm:text-sm rounded-none flex items-center justify-center gap-1.5 transition-colors select-none shadow-none"
                                >
                                  <span>View Syllabus &rarr;</span>
                                </Link>
                              </div>
                            </div>
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
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    My Certificates
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Official certificates of completion signed by instructor{' '}
                    {siteConfig.instructor.name}.
                  </p>
                </div>

                {completedCourses.length === 0 ? (
                  <div className="bg-white border border-neutral-200 rounded-none p-8 sm:p-10 text-left space-y-4 max-w-md shadow-none">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-neutral-900 uppercase">
                        NO CERTIFICATES EARNED YET.
                      </h2>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Complete all lesson modules and practical evaluations in your enrolled
                        courses to automatically unlock your verified certificate.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleTabChange('courses')}
                        className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-black hover:bg-[#262626] text-white font-bold text-xs uppercase tracking-wider rounded-none transition-colors shadow-none cursor-pointer"
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
                        className="bg-white border border-neutral-200 rounded-none p-6 shadow-none space-y-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-none bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
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

                        <div className="p-3.5 rounded-none bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                          <p>
                            <strong className="text-neutral-900">Credential:</strong> Verified
                            Certificate of Completion
                          </p>
                          <p>
                            <strong className="text-neutral-900">Instructor:</strong>{' '}
                            {siteConfig.instructor.name}
                          </p>
                        </div>

                        <Link
                          href={`/learn/${c.product.slug}`}
                          className="w-full h-10 bg-black hover:bg-[#262626] text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 shadow-none"
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

            {/* TAB 3: HYDRAULIC SYSTEM CALCULATOR */}
            {activeTab === 'calculator' && <HydraulicCalculator />}

            {/* TAB 4: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-6 text-left">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Profile &amp; Account
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Manage your personal details, email verification, and security credentials.
                  </p>
                </div>

                {/* 2-Column Responsive Grid: Profile on Left, Password on Right (Compact horizontal width on desktop) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start w-full max-w-md lg:max-w-[720px]">
                  {/* Personal Details Card (Left) */}
                  <div className="bg-white border border-neutral-200/80 rounded-none overflow-hidden shadow-none text-left w-full lg:max-w-[345px]">
                    {/* Header with border joining outer outline */}
                    <div className="px-5 sm:px-7 py-4 sm:py-4.5 border-b border-neutral-200 flex items-center gap-2.5">
                      <UserIcon className="w-4 h-4 text-neutral-900" />
                      <h2 className="text-base sm:text-[17px] font-bold text-neutral-900">
                        Personal Information
                      </h2>
                    </div>

                    <div className="p-5 sm:p-7">
                      <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-4.5">
                        {/* Name Input */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-name"
                            className="text-sm font-bold text-neutral-900 block"
                          >
                            Full Name
                          </label>
                          <input
                            id="profile-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-none text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all shadow-none"
                          />
                        </div>

                        {/* Email Address */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-email"
                            className="text-sm font-bold text-neutral-900 block"
                          >
                            Email Address
                          </label>
                          <input
                            id="profile-email"
                            type="email"
                            disabled
                            value={user?.email || ''}
                            className="w-full h-11 px-3.5 bg-neutral-100 border border-neutral-200 rounded-none text-sm text-neutral-600 cursor-not-allowed select-none shadow-none disabled:bg-neutral-100 disabled:text-neutral-600 disabled:cursor-not-allowed"
                          />
                          {!user?.emailVerifiedAt && (
                            <div className="flex items-center gap-3 pt-1">
                              <Link
                                href={`/verify-email?email=${encodeURIComponent(user?.email || '')}`}
                                className="text-xs font-semibold text-black hover:underline"
                              >
                                Enter 6-digit OTP &rarr;
                              </Link>
                              <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={resendingVerification}
                                className="text-xs font-semibold text-neutral-600 hover:text-black underline cursor-pointer disabled:opacity-50"
                              >
                                {resendingVerification ? 'Sending...' : 'Resend OTP'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Phone Input */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-phone"
                            className="text-sm font-bold text-neutral-900 block"
                          >
                            Phone Number
                          </label>
                          <input
                            id="profile-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full h-11 px-3.5 bg-white border border-neutral-300 rounded-none text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all shadow-none font-mono"
                          />
                        </div>

                        <div className="pt-1.5">
                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="w-full h-11 px-6 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-semibold text-sm rounded-none transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Change Password Card (Right) */}
                  <div className="bg-white border border-neutral-200/80 rounded-none overflow-hidden shadow-none text-left w-full lg:max-w-[345px]">
                    {/* Header with border joining outer outline */}
                    <div className="px-5 sm:px-7 py-4 sm:py-4.5 border-b border-neutral-200 flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-neutral-900" />
                      <h2 className="text-base sm:text-[17px] font-bold text-neutral-900">
                        Security &amp; Password
                      </h2>
                    </div>

                    <div className="p-5 sm:p-7">
                      <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-4.5">
                        {passwordError && (
                          <div className="p-3.5 rounded-none bg-red-500/10 border border-red-500/25 text-red-700 text-xs sm:text-[13px] font-medium">
                            {passwordError}
                          </div>
                        )}

                        {/* Current Password */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-current-password"
                            className="text-sm font-bold text-neutral-900 block"
                          >
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              id="profile-current-password"
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              required
                              placeholder="Your current password"
                              className="w-full h-11 px-3.5 pr-11 bg-white border border-neutral-300 rounded-none text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all shadow-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                            >
                              {showCurrentPassword ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-new-password"
                            className="text-sm font-bold text-neutral-900 block"
                          >
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              id="profile-new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              placeholder="At least 8 characters"
                              className="w-full h-11 px-3.5 pr-11 bg-white border border-neutral-300 rounded-none text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all shadow-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewPassword ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-confirm-password"
                            className="text-sm font-bold text-neutral-900 block"
                          >
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              id="profile-confirm-password"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              placeholder="Repeat new password"
                              className="w-full h-11 px-3.5 pr-11 bg-white border border-neutral-300 rounded-none text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all shadow-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="pt-1.5">
                          <button
                            type="submit"
                            disabled={passwordSaving}
                            className="w-full h-11 px-6 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-semibold text-sm rounded-none transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PAYMENT ORDERS */}
            {activeTab === 'orders' && (
              <div className="space-y-6 text-left">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Payment Orders &amp; Invoices
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Download official GST tax invoices in PDF format for company or personal
                    reimbursement.
                  </p>
                </div>

                {ordersLoading ? (
                  <div className="bg-white border border-neutral-200/80 rounded-none p-10 text-center text-sm font-semibold text-neutral-500 flex flex-col items-center justify-center gap-3 shadow-none w-full max-w-lg lg:max-w-[480px]">
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                    <span>Loading payment orders...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white border border-neutral-200/80 rounded-none p-7 sm:p-9 text-left space-y-4 w-full max-w-lg lg:max-w-[480px] shadow-none">
                    <div className="space-y-1.5">
                      <h2 className="text-lg font-bold text-neutral-900">No payment history yet</h2>
                      <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                        Once you enroll in a course, your official GST tax invoices and payment
                        receipts will appear here.
                      </p>
                    </div>
                    <div>
                      <Link
                        href="/#pricing"
                        className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-semibold text-sm rounded-none transition-colors shadow-none"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>View Courses</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 w-full max-w-lg lg:max-w-[480px] text-left">
                    {orders.map((ord) => {
                      const amountFormatted = (
                        (ord.totalPaise ??
                          ord.amountPaise ??
                          ord.invoice?.totalPaise ??
                          ord.payments?.[0]?.amountPaise ??
                          0) / 100
                      ).toLocaleString('en-IN');

                      return (
                        <div
                          key={ord.id}
                          className="bg-white border border-neutral-200/80 rounded-none overflow-hidden select-none shadow-none text-left"
                        >
                          {/* 1. Header Bar: Order reference, date, status, and total amount */}
                          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50/50">
                            {/* Order ID & Date */}
                            <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-[13px] min-w-0">
                              <span className="font-mono font-bold text-neutral-900 tracking-tight">
                                {formatDisplayOrderId(ord.orderNumber || ord.id)}
                              </span>
                              <span className="text-neutral-300">•</span>
                              <span className="text-neutral-500 font-medium whitespace-nowrap">
                                {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>

                            {/* Status Badge + Amount */}
                            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                              <span
                                className={`px-2.5 py-0.5 sm:py-1 text-[11px] font-bold tracking-wider uppercase rounded-none shrink-0 select-none ${
                                  ord.status === 'PAID'
                                    ? 'text-white bg-[#0e5c2f]'
                                    : ord.status === 'FAILED'
                                      ? 'text-white bg-rose-700'
                                      : 'text-neutral-700 bg-neutral-200'
                                }`}
                              >
                                {ord.status === 'PAID' ? 'PAID' : ord.status}
                              </span>
                              <span className="font-mono font-bold text-sm sm:text-base text-neutral-900 whitespace-nowrap">
                                ₹{amountFormatted}
                              </span>
                            </div>
                          </div>

                          {/* 2. Card Body: Course information and direct action buttons */}
                          <div className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-1 min-w-0">
                              <h2 className="text-base sm:text-[17px] font-bold text-neutral-900 leading-snug">
                                {ord.product.title}
                              </h2>
                              <p className="text-xs text-neutral-500 font-medium">
                                12 Months Access
                              </p>
                            </div>

                            {/* Actions: Download Invoice & Access Course equally spread on bottom */}
                            <div className="grid grid-cols-2 gap-3 pt-1 w-full">
                              {ord.invoice ? (
                                <a
                                  href={`${siteConfig.urls.api}/api/v1/invoices/${ord.invoice.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-10 px-3 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 border border-neutral-300 hover:border-neutral-400 font-semibold text-xs sm:text-[13px] rounded-none transition-colors inline-flex items-center justify-center gap-2 shadow-none cursor-pointer w-full text-center select-none"
                                >
                                  <Download className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                                  <span className="truncate">Download Invoice</span>
                                </a>
                              ) : (
                                <div className="h-10 px-3 bg-neutral-50 text-neutral-400 border border-neutral-200 font-medium text-xs rounded-none inline-flex items-center justify-center text-center w-full select-none">
                                  <span className="truncate">Generating Invoice...</span>
                                </div>
                              )}

                              <Link
                                href={`/learn/${ord.product.slug}`}
                                className="h-10 px-3 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-semibold text-xs sm:text-[13px] rounded-none transition-colors inline-flex items-center justify-center gap-1.5 shadow-none w-full text-center select-none"
                              >
                                <span className="truncate">Go to Course</span>
                                <span className="shrink-0">&rarr;</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardShellSkeleton() {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit select-none z-10 flex flex-col md:flex-row gap-2.5 sm:gap-3">
      {/* Left Card Skeleton */}
      <aside className="w-full shrink-0 md:flex-none md:w-72 lg:w-80 md:h-full md:shrink-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex flex-col select-none">
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase">
              BASICS
            </span>
          </div>
          <span className="text-[11px] font-mono tracking-wider text-[#c2c4cc]/70">Home</span>
        </div>
        <div className="border-b border-white/[0.08] w-full shrink-0" />
        <div className="p-2.5 space-y-1">
          <div className="h-10 w-full bg-[#1f2023] rounded-xl flex items-center px-3.5 gap-3">
            <div className="w-4 h-4 bg-white/20 rounded" />
            <div className="h-4 w-24 bg-white/20 rounded" />
          </div>
          <div className="h-10 w-full bg-transparent rounded-xl flex items-center px-3.5 gap-3">
            <div className="w-4 h-4 bg-white/10 rounded" />
            <div className="h-4 w-28 bg-white/10 rounded" />
          </div>
          <div className="h-10 w-full bg-transparent rounded-xl flex items-center px-3.5 gap-3">
            <div className="w-4 h-4 bg-white/10 rounded" />
            <div className="h-4 w-20 bg-white/10 rounded" />
          </div>
          <div className="h-10 w-full bg-transparent rounded-xl flex items-center px-3.5 gap-3">
            <div className="w-4 h-4 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
          </div>
          <div className="h-10 w-full bg-transparent rounded-xl flex items-center px-3.5 gap-3">
            <div className="w-4 h-4 bg-white/10 rounded" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
        </div>
      </aside>

      {/* Right Card Skeleton */}
      <main className="w-full flex-1 min-h-0 md:h-full md:min-w-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden relative">
        <div className="h-12 px-5 sm:px-6 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#101012]">
          <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7 md:p-8 space-y-6">
          <div className="space-y-2 animate-pulse">
            <div className="h-7 w-40 bg-white/10 rounded-md" />
            <div className="h-4 w-64 bg-white/5 rounded-md" />
          </div>
          <div className="w-full max-w-4xl bg-white/5 border border-white/[0.08] rounded-xl p-5 flex flex-col md:flex-row gap-5 animate-pulse">
            <div className="w-full md:w-[320px] lg:w-[360px] aspect-[16/10] bg-white/10 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
              <div className="space-y-2.5">
                <div className="h-6 w-3/5 bg-white/10 rounded" />
                <div className="h-4 w-full bg-white/5 rounded" />
                <div className="h-4 w-4/5 bg-white/5 rounded" />
              </div>
              <div className="h-4 w-44 bg-white/5 rounded" />
              <div className="h-10 w-48 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MyCoursesPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
}
