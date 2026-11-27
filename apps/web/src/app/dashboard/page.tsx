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
  User as UserIcon,
  Menu,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Download,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  Sigma,
  LogOut,
  Layers,
  Files,
  IndianRupee,
  Settings,
  Award,
  ChevronDown,
  Shapes,
} from 'lucide-react';
import {
  HydraulicCalculator,
  CALCULATOR_SUB_SECTIONS,
  type CalculatorSection,
} from '../../components/calculator/HydraulicCalculator';

export type DashboardTab =
  'courses' | 'certificates' | 'calculator' | 'symbols' | 'profile' | 'orders';

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
      className="w-full flex items-center gap-2 select-none"
      aria-label={`Course progress: ${clamped}%`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Percentage on Left Side Only */}
      <span className="text-white font-medium text-xs font-mono leading-none shrink-0 select-none">
        {clamped}%
      </span>

      {/* Sleek Progress Bar Track with solid white fill */}
      <div className="flex-1 h-1 sm:h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser, logout } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const VALID_TABS: DashboardTab[] = [
    'courses',
    'certificates',
    'calculator',
    'symbols',
    'profile',
    'orders',
  ];

  const tabParam = searchParams.get('tab');
  const isPreviewUnlocked = searchParams.get('preview_unlocked') === 'true';
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    if (tabParam === 'tools') return 'calculator';
    if (tabParam && VALID_TABS.includes(tabParam as DashboardTab)) return tabParam as DashboardTab;
    return isPreviewUnlocked ? 'certificates' : 'courses';
  });

  const [isMainOpen, setIsMainOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(true);

  const [activeCalculatorSection, setActiveCalculatorSection] = useState<CalculatorSection>(() => {
    const calcParam = searchParams.get('calc') as CalculatorSection | null;
    if (calcParam && ['cylinder', 'motor', 'pump', 'pressure-drop', 'piping'].includes(calcParam)) {
      return calcParam;
    }
    return 'cylinder';
  });
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(true);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const calc = searchParams.get('calc') as CalculatorSection | null;
    if (calc && ['cylinder', 'motor', 'pump', 'pressure-drop', 'piping'].includes(calc)) {
      setActiveCalculatorSection(calc);
    }
    const preview = searchParams.get('preview_unlocked') === 'true';
    if (tab === 'tools') {
      setActiveTab('calculator');
      setIsToolsOpen(true);
      setIsCalculatorOpen(true);
    } else if (tab && VALID_TABS.includes(tab as DashboardTab)) {
      setActiveTab(tab as DashboardTab);
      if (tab === 'calculator') {
        setIsToolsOpen(true);
        setIsCalculatorOpen(true);
      } else if (tab === 'symbols') {
        setIsToolsOpen(true);
      } else if (tab === 'profile' || tab === 'orders') {
        setIsProfileOpen(true);
      }
    } else if (preview) {
      setActiveTab('certificates');
    }
  }, [searchParams]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef(false);

  const handleMobileNavTouchStart = useCallback((e: React.TouchEvent) => {
    const firstTouch = e.touches[0];
    if (firstTouch) {
      touchStartPosRef.current = {
        x: firstTouch.clientX,
        y: firstTouch.clientY,
      };
      isTouchDraggingRef.current = false;
    }
  }, []);

  const handleMobileNavTouchMove = useCallback((e: React.TouchEvent) => {
    const firstTouch = e.touches[0];
    if (!touchStartPosRef.current || !firstTouch) return;
    const deltaX = Math.abs(firstTouch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(firstTouch.clientY - touchStartPosRef.current.y);
    if (deltaX > 8 || deltaY > 8) {
      isTouchDraggingRef.current = true;
    }
  }, []);

  const handleMobileNavTouchEnd = useCallback(() => {
    setTimeout(() => {
      isTouchDraggingRef.current = false;
      touchStartPosRef.current = null;
    }, 120);
  }, []);

  const handleMobileNavClickCapture = useCallback((e: React.MouseEvent) => {
    if (isTouchDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const desktopNavRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<{ [key in DashboardTab]?: HTMLButtonElement | null }>({});
  const [mounted, setMounted] = useState(false);
  const prevSectionRef = useRef<'main' | 'tool' | 'profile' | null>(null);
  const [slideEnabledSection, setSlideEnabledSection] = useState<
    'main' | 'tool' | 'profile' | null
  >(null);
  const [sectionIndicators, setSectionIndicators] = useState<{
    main: { top: number; height: number };
    tool: { top: number; height: number };
    profile: { top: number; height: number };
  }>({
    main: { top: 0, height: 0 },
    tool: { top: 0, height: 0 },
    profile: { top: 0, height: 0 },
  });

  const currentSection: 'main' | 'tool' | 'profile' =
    activeTab === 'courses' || activeTab === 'certificates'
      ? 'main'
      : activeTab === 'calculator' || activeTab === 'symbols'
        ? 'tool'
        : 'profile';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Courses state
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Handler for selecting a specific calculator sub-section
  const handleCalculatorSubSectionChange = useCallback((subSection: CalculatorSection) => {
    if (isTouchDraggingRef.current) return;
    setActiveTab('calculator');
    setActiveCalculatorSection(subSection);
    setIsToolsOpen(true);
    setIsCalculatorOpen(true);
    setIsMobileMenuOpen(false);

    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'calculator');
    url.searchParams.set('calc', subSection);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Sync tab with URL query parameter
  const handleTabChange = useCallback(
    (newTab: DashboardTab) => {
      if (isTouchDraggingRef.current) return;
      setActiveTab(newTab);
      setIsMobileMenuOpen(false);
      if (newTab === 'calculator') {
        setIsToolsOpen(true);
        setIsCalculatorOpen(true);
      } else if (newTab === 'symbols') {
        setIsToolsOpen(true);
      } else if (newTab === 'profile' || newTab === 'orders') {
        setIsProfileOpen(true);
      } else if (newTab === 'courses' || newTab === 'certificates') {
        setIsMainOpen(true);
      }
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      if (newTab === 'calculator') {
        url.searchParams.set('calc', activeCalculatorSection);
      } else {
        url.searchParams.delete('calc');
      }
      window.history.replaceState({}, '', url.toString());
    },
    [activeCalculatorSection],
  );

  useEffect(() => {
    if (activeTab === 'calculator') {
      setIsToolsOpen(true);
      setIsCalculatorOpen(true);
    } else if (activeTab === 'symbols') {
      setIsToolsOpen(true);
    } else if (activeTab === 'profile' || activeTab === 'orders') {
      setIsProfileOpen(true);
    }
  }, [activeTab]);

  // Smoothly move highlight pill to active tab within its own section
  const updateIndicator = useCallback(() => {
    const isMainTab = activeTab === 'courses' || activeTab === 'certificates';
    const isToolTab = activeTab === 'calculator' || activeTab === 'symbols';

    const targetSection: 'main' | 'tool' | 'profile' = isMainTab
      ? 'main'
      : isToolTab
        ? 'tool'
        : 'profile';

    const activeEl = tabRefs.current[activeTab];
    if (!activeEl) return;

    const isSameSection = prevSectionRef.current === targetSection;

    if (targetSection === 'main') {
      setSectionIndicators((prev) => ({
        ...prev,
        main: { top: activeEl.offsetTop, height: activeEl.offsetHeight },
      }));
    } else if (targetSection === 'tool') {
      setSectionIndicators((prev) => ({
        ...prev,
        tool: { top: activeEl.offsetTop, height: activeEl.offsetHeight },
      }));
    } else if (targetSection === 'profile') {
      setSectionIndicators((prev) => ({
        ...prev,
        profile: { top: activeEl.offsetTop, height: activeEl.offsetHeight },
      }));
    }

    if (isSameSection) {
      setSlideEnabledSection(targetSection);
    } else {
      // Cross-section switch: immediately disable transition so the previous section doesn't leave a ghost shadow
      setSlideEnabledSection(null);
      requestAnimationFrame(() => {
        setSlideEnabledSection(targetSection);
      });
      prevSectionRef.current = targetSection;
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    const timer1 = setTimeout(updateIndicator, 50);
    const timer2 = setTimeout(updateIndicator, 320);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [
    updateIndicator,
    isMainOpen,
    isToolsOpen,
    isProfileOpen,
    isCalculatorOpen,
    coursesLoading,
    authLoading,
  ]);

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

  // Completed courses eligible for certificate (unlocks at >= 90% or with preview_unlocked=true)
  const completedCourses = useMemo(() => {
    if (courses.length > 0) {
      const realCompleted = courses.filter((c) => (c.progress?.percentComplete ?? 0) >= 90);
      if (realCompleted.length > 0 && !isPreviewUnlocked) return realCompleted;
      if (isPreviewUnlocked) {
        // Treat enrolled courses as 100% completed
        return courses.map((c) => ({
          ...c,
          progress: {
            ...c.progress,
            percentComplete: 100,
            completedLessons: c.progress?.totalLessons || 16,
            totalLessons: c.progress?.totalLessons || 16,
          },
        }));
      }
    } else if (isPreviewUnlocked) {
      // Mock sample course for instant preview
      return [
        {
          product: {
            id: 'demo-unlocked-course',
            title: 'Hydraulic System Basics',
            slug: 'hydraulic-system-basics',
            shortDescription: 'Industrial hydraulic engineering fundamentals and circuit design.',
          },
          progress: {
            percentComplete: 100,
            completedLessons: 16,
            totalLessons: 16,
            lastAccessedAt: new Date().toISOString(),
          },
          enrollment: {
            id: 'enr-demo-unlocked',
            enrolledAt: new Date().toISOString(),
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          },
        } as unknown as EnrolledCourse,
      ];
    }
    return [];
  }, [courses, isPreviewUnlocked]);

  const mainNavTabs: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  }[] = [
    { id: 'courses', label: 'Courses', icon: Layers },
    { id: 'certificates', label: 'Credentials', icon: Files },
  ];

  const profileNavTabs: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  }[] = [
    { id: 'profile', label: 'Settings', icon: Settings },
    { id: 'orders', label: 'Payments', icon: IndianRupee },
  ];

  const studentFirstName = useMemo(() => {
    if (!user?.name) return 'ENGINEER';
    const first = user.name.trim().split(' ')[0] ?? '';
    return first ? first.toUpperCase() : 'ENGINEER';
  }, [user?.name]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 17 || hour < 4) {
      return {
        title: `Long day, ${studentFirstName}?`,
        subtitle: 'One last push before calling it a day.',
      };
    }
    if (hour >= 4 && hour < 12) {
      return {
        title: `Good morning, ${studentFirstName}!`,
        subtitle: 'Ready to master industrial hydraulic systems today?',
      };
    }
    return {
      title: `Welcome back, ${studentFirstName}!`,
      subtitle: 'Keep up the momentum in your hydraulic engineering training.',
    };
  }, [studentFirstName]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit select-none z-10 flex flex-col md:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* 1. LEFT CARD: NAVIGATION TABS                                  */}
      {/* ============================================================== */}
      <aside className="w-full shrink-0 md:flex-none md:w-60 lg:w-64 md:h-full md:shrink-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden">
        {/* Top Header: Brand Logo HYDRO BASICS + Back / Home Link + Mobile Sandwich Button */}
        <div className="px-4 py-3 flex items-center justify-between shrink-0">
          <Link href="/" className="flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[14px] sm:text-[15px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[14px] sm:text-[15px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
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
        <div className="border-b border-white/[0.08] w-full shrink-0 mt-[0px]" />

        {/* Mobile Expandable Tabs Stack (Sandwich Dropdown) */}
        <div
          className={`md:hidden grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
            isMobileMenuOpen
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-h-[min(72vh,calc(100dvh-120px))] overflow-y-auto custom-scrollbar overscroll-contain [touch-action:pan-y]">
            <nav
              aria-label="Student Navigation Mobile"
              onTouchStart={handleMobileNavTouchStart}
              onTouchMove={handleMobileNavTouchMove}
              onTouchEnd={handleMobileNavTouchEnd}
              onTouchCancel={handleMobileNavTouchEnd}
              onClickCapture={handleMobileNavClickCapture}
              className="flex flex-col px-2 py-2 gap-0.5 select-none [-webkit-tap-highlight-color:transparent]"
            >
              {/* SECTION 1: MAIN */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsMainOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-0.5 text-[9px] font-sans font-semibold tracking-widest text-[#7e828d] uppercase select-none transition-colors cursor-pointer group [-webkit-tap-highlight-color:transparent]"
              >
                <span>MAIN</span>
                <ChevronDown
                  strokeWidth={2}
                  className={`w-2.5 h-2.5 transition-transform duration-200 ${
                    isMainOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
                  }`}
                />
              </button>

              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isMainOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="min-h-0 overflow-hidden flex flex-col gap-1 pt-1">
                  {mainNavTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none [-webkit-tap-highlight-color:transparent] ${
                          isActive
                            ? 'bg-[#1f2023] text-white font-medium'
                            : 'text-[#9ca3af] font-normal'
                        }`}
                      >
                        <Icon
                          strokeWidth={1.5}
                          className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#9ca3af]'}`}
                        />
                        <span
                          className={`transition-colors ${isActive ? 'text-white font-medium' : 'text-[#9ca3af] font-normal'}`}
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg text-emerald-400 font-normal transition-colors cursor-pointer select-none [-webkit-tap-highlight-color:transparent]"
                    >
                      <ShieldCheck
                        strokeWidth={1.5}
                        className="w-4 h-4 shrink-0 text-emerald-400"
                      />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Section Divider */}
              <div className="border-b border-white/[0.06] my-1 mx-1.5 shrink-0" />

              {/* SECTION 2: TOOLS */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsToolsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-0.5 text-[9px] font-sans font-semibold tracking-widest text-[#7e828d] uppercase select-none transition-colors cursor-pointer group [-webkit-tap-highlight-color:transparent]"
              >
                <span>TOOLS</span>
                <ChevronDown
                  strokeWidth={2}
                  className={`w-2.5 h-2.5 transition-transform duration-200 ${
                    isToolsOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
                  }`}
                />
              </button>

              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isToolsOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="min-h-0 overflow-hidden flex flex-col gap-1 pt-1">
                  {/* Item 1: Calculator with expandable nested sub-sections */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCalculatorOpen((prev) => !prev);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none group [-webkit-tap-highlight-color:transparent] ${
                        activeTab === 'calculator' && !isCalculatorOpen
                          ? 'bg-[#1f2023] text-white font-medium'
                          : activeTab === 'calculator' && isCalculatorOpen
                            ? 'text-white font-medium'
                            : 'text-[#9ca3af] font-normal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Sigma
                          strokeWidth={1.5}
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            activeTab === 'calculator' ? 'text-white' : 'text-[#9ca3af]'
                          }`}
                        />
                        <span
                          className={`truncate transition-colors ${
                            activeTab === 'calculator' ? 'text-white font-medium' : 'text-[#9ca3af]'
                          }`}
                        >
                          Calculator
                        </span>
                      </div>
                      <ChevronDown
                        strokeWidth={2}
                        className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                          isCalculatorOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
                        }`}
                      />
                    </button>

                    {/* Nested Sub-sections with Tree Line */}
                    <div
                      className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isCalculatorOpen
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden flex flex-col pt-1">
                        {CALCULATOR_SUB_SECTIONS.map((sub, idx) => {
                          const isSubActive =
                            activeTab === 'calculator' && activeCalculatorSection === sub.id;
                          const isLast = idx === CALCULATOR_SUB_SECTIONS.length - 1;

                          return (
                            <div key={sub.id} className="relative flex items-center h-9">
                              <svg
                                className="absolute left-0 top-0 w-7 h-full pointer-events-none"
                                viewBox="0 0 28 36"
                                fill="none"
                              >
                                {!isLast && (
                                  <line
                                    x1="20"
                                    y1="0"
                                    x2="20"
                                    y2="36"
                                    stroke="rgba(255, 255, 255, 0.12)"
                                    strokeWidth="1.5"
                                  />
                                )}
                                <path
                                  d="M 20 0 V 10 C 20 15, 23 18, 28 18"
                                  stroke={isSubActive ? '#c2c4cc' : 'rgba(255, 255, 255, 0.12)'}
                                  strokeWidth="1.5"
                                  fill="none"
                                />
                              </svg>
                              <button
                                type="button"
                                onClick={() => handleCalculatorSubSectionChange(sub.id)}
                                className={`ml-7 w-full flex items-center px-3 py-1.5 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none truncate [-webkit-tap-highlight-color:transparent] ${
                                  isSubActive
                                    ? 'bg-[#1f2023] text-white font-medium'
                                    : 'text-[#9ca3af] font-normal'
                                }`}
                              >
                                <span className="truncate">{sub.label}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Item 2: Symbols */}
                  <button
                    type="button"
                    onClick={() => handleTabChange('symbols')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none [-webkit-tap-highlight-color:transparent] ${
                      activeTab === 'symbols'
                        ? 'bg-[#1f2023] text-white font-medium'
                        : 'text-[#9ca3af] font-normal'
                    }`}
                  >
                    <Shapes
                      strokeWidth={1.5}
                      className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'symbols' ? 'text-white' : 'text-[#9ca3af]'}`}
                    />
                    <span
                      className={`transition-colors ${activeTab === 'symbols' ? 'text-white font-medium' : 'text-[#9ca3af] font-normal'}`}
                    >
                      Symbols
                    </span>
                  </button>
                </div>
              </div>

              {/* Section Divider */}
              <div className="border-b border-white/[0.06] my-1 mx-1.5 shrink-0" />

              {/* SECTION 3: PROFILE */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-0.5 text-[9px] font-sans font-semibold tracking-widest text-[#7e828d] uppercase select-none transition-colors cursor-pointer group [-webkit-tap-highlight-color:transparent]"
              >
                <span>PROFILE</span>
                <ChevronDown
                  strokeWidth={2}
                  className={`w-2.5 h-2.5 transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
                  }`}
                />
              </button>

              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isProfileOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="min-h-0 overflow-hidden flex flex-col gap-1 pt-1">
                  {profileNavTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none [-webkit-tap-highlight-color:transparent] ${
                          isActive
                            ? 'bg-[#1f2023] text-white font-medium'
                            : 'text-[#9ca3af] font-normal'
                        }`}
                      >
                        <Icon
                          strokeWidth={1.5}
                          className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#9ca3af]'}`}
                        />
                        <span
                          className={`transition-colors ${isActive ? 'text-white font-medium' : 'text-[#9ca3af] font-normal'}`}
                        >
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg text-[#9ca3af] font-normal transition-colors cursor-pointer select-none text-left [-webkit-tap-highlight-color:transparent]"
                  >
                    <LogOut strokeWidth={1.5} className="w-4 h-4 shrink-0 text-[#9ca3af]" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>

        {/* Desktop Vertical Tabs Stack with Smooth Sliding Highlight Pill */}
        <nav
          ref={desktopNavRef}
          aria-label="Student Navigation Desktop"
          style={{ overflowAnchor: 'none' }}
          className="relative hidden md:flex flex-1 flex-col overflow-y-auto custom-scrollbar px-2 py-2 gap-0.5"
        >
          {/* SECTION 1: MAIN */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const nav = desktopNavRef.current;
              const currentScroll = nav?.scrollTop ?? 0;
              setIsMainOpen((prev) => !prev);
              if (nav) {
                requestAnimationFrame(() => {
                  nav.scrollTop = currentScroll;
                });
              }
            }}
            className="w-full flex items-center justify-between px-2.5 py-0.5 text-[9px] font-sans font-semibold tracking-widest text-[#7e828d] hover:text-[#c2c4cc] uppercase select-none transition-colors cursor-pointer group"
          >
            <span>MAIN</span>
            <ChevronDown
              strokeWidth={2}
              className={`w-2.5 h-2.5 transition-transform duration-200 ${
                isMainOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
              }`}
            />
          </button>

          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
              isMainOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative min-h-0 overflow-hidden flex flex-col gap-1 pt-1">
              {/* Smooth Sliding Highlight Pill for MAIN */}
              <div
                className="absolute left-0 right-0 rounded-lg bg-[#1f2023] pointer-events-none z-0"
                style={{
                  top: sectionIndicators.main.top,
                  height: sectionIndicators.main.height,
                  opacity: currentSection === 'main' && isMainOpen ? 1 : 0,
                  transition:
                    slideEnabledSection === 'main'
                      ? 'top 200ms cubic-bezier(0.4, 0, 0.2, 1), height 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                      : 'none',
                }}
              />

              {mainNavTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none group ${
                      isActive
                        ? !mounted
                          ? 'bg-[#1f2023] text-white font-medium'
                          : 'text-white font-medium'
                        : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.04] font-normal'
                    }`}
                  >
                    <Icon
                      strokeWidth={1.5}
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#9ca3af] group-hover:text-white'
                      }`}
                    />
                    <span
                      className={`truncate transition-colors ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-[#9ca3af] font-normal group-hover:text-white'
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
                  className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left font-normal text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer select-none group"
                >
                  <ShieldCheck
                    strokeWidth={1.5}
                    className="w-4 h-4 shrink-0 text-emerald-400 transition-colors"
                  />
                  <span className="truncate">Admin Console</span>
                </Link>
              )}
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-b border-white/[0.06] my-1 mx-1.5 shrink-0" />

          {/* SECTION 2: TOOLS (like ADDITIONAL in TUF) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const nav = desktopNavRef.current;
              const currentScroll = nav?.scrollTop ?? 0;
              setIsToolsOpen((prev) => !prev);
              if (nav) {
                requestAnimationFrame(() => {
                  nav.scrollTop = currentScroll;
                });
              }
            }}
            className="w-full flex items-center justify-between px-2.5 py-0.5 text-[9px] font-sans font-semibold tracking-widest text-[#7e828d] hover:text-[#c2c4cc] uppercase select-none transition-colors cursor-pointer group"
          >
            <span>TOOLS</span>
            <ChevronDown
              strokeWidth={2}
              className={`w-2.5 h-2.5 transition-transform duration-200 ${
                isToolsOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
              }`}
            />
          </button>

          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
              isToolsOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative min-h-0 overflow-hidden flex flex-col gap-1 pt-1">
              {/* Smooth Sliding Highlight Pill for TOOLS */}
              <div
                className="absolute left-0 right-0 rounded-lg bg-[#1f2023] pointer-events-none z-0"
                style={{
                  top: sectionIndicators.tool.top,
                  height: sectionIndicators.tool.height,
                  opacity:
                    currentSection === 'tool' &&
                    isToolsOpen &&
                    (activeTab === 'symbols' || !isCalculatorOpen)
                      ? 1
                      : 0,
                  transition:
                    slideEnabledSection === 'tool'
                      ? 'top 200ms cubic-bezier(0.4, 0, 0.2, 1), height 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease-out'
                      : 'opacity 150ms ease-out',
                }}
              />

              {/* Item 1: Calculator with expandable nested sub-sections */}
              <div className="flex flex-col">
                <button
                  ref={(el) => {
                    tabRefs.current['calculator'] = el;
                  }}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const nav = desktopNavRef.current;
                    const currentScroll = nav?.scrollTop ?? 0;
                    setIsCalculatorOpen((prev) => !prev);
                    if (nav) {
                      requestAnimationFrame(() => {
                        nav.scrollTop = currentScroll;
                      });
                    }
                  }}
                  className={`relative z-10 w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none group ${
                    activeTab === 'calculator' && !isCalculatorOpen
                      ? !mounted
                        ? 'bg-[#1f2023] text-white font-medium'
                        : 'text-white font-medium'
                      : activeTab === 'calculator' && isCalculatorOpen
                        ? 'text-white font-medium'
                        : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.04] font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sigma
                      strokeWidth={1.5}
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        activeTab === 'calculator'
                          ? 'text-white'
                          : 'text-[#9ca3af] group-hover:text-white'
                      }`}
                    />
                    <span
                      className={`truncate transition-colors ${
                        activeTab === 'calculator'
                          ? 'text-white font-medium'
                          : 'text-[#9ca3af] font-normal group-hover:text-white'
                      }`}
                    >
                      Calculator
                    </span>
                  </div>
                  <ChevronDown
                    strokeWidth={2}
                    className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                      isCalculatorOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
                    }`}
                  />
                </button>

                {/* Nested Dropdown Sub-sections with Tree Line */}
                <div
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    isCalculatorOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden flex flex-col pt-1">
                    {CALCULATOR_SUB_SECTIONS.map((sub, idx) => {
                      const isSubActive =
                        activeTab === 'calculator' && activeCalculatorSection === sub.id;
                      const isLast = idx === CALCULATOR_SUB_SECTIONS.length - 1;

                      return (
                        <div key={sub.id} className="relative flex items-center h-9">
                          {/* Tree Branch Connector SVG */}
                          <svg
                            className="absolute left-0 top-0 w-7 h-full pointer-events-none"
                            viewBox="0 0 28 36"
                            fill="none"
                            preserveAspectRatio="none"
                          >
                            {!isLast && (
                              <line
                                x1="20"
                                y1="0"
                                x2="20"
                                y2="36"
                                stroke="rgba(255, 255, 255, 0.12)"
                                strokeWidth="1.5"
                              />
                            )}
                            <path
                              d="M 20 0 V 10 C 20 15, 23 18, 28 18"
                              stroke={isSubActive ? '#c2c4cc' : 'rgba(255, 255, 255, 0.12)'}
                              strokeWidth="1.5"
                              fill="none"
                            />
                          </svg>

                          {/* Sub-item button */}
                          <button
                            type="button"
                            onClick={() => handleCalculatorSubSectionChange(sub.id)}
                            className={`ml-7 w-full flex items-center px-3 py-1.5 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none truncate ${
                              isSubActive
                                ? 'bg-[#1f2023] text-white font-medium'
                                : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.04] font-normal'
                            }`}
                          >
                            <span className="truncate">{sub.label}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Item 2: Symbols */}
              <button
                key="symbols"
                ref={(el) => {
                  tabRefs.current['symbols'] = el;
                }}
                type="button"
                onClick={() => handleTabChange('symbols')}
                className={`relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none group ${
                  activeTab === 'symbols'
                    ? !mounted
                      ? 'bg-[#1f2023] text-white font-medium'
                      : 'text-white font-medium'
                    : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.04] font-normal'
                }`}
              >
                <Shapes
                  strokeWidth={1.5}
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    activeTab === 'symbols' ? 'text-white' : 'text-[#9ca3af] group-hover:text-white'
                  }`}
                />
                <span
                  className={`truncate transition-colors ${
                    activeTab === 'symbols'
                      ? 'text-white font-medium'
                      : 'text-[#9ca3af] font-normal group-hover:text-white'
                  }`}
                >
                  Symbols
                </span>
              </button>
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-b border-white/[0.06] my-1 mx-1.5 shrink-0" />

          {/* SECTION 3: PROFILE */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const nav = desktopNavRef.current;
              const currentScroll = nav?.scrollTop ?? 0;
              setIsProfileOpen((prev) => !prev);
              if (nav) {
                requestAnimationFrame(() => {
                  nav.scrollTop = currentScroll;
                });
              }
            }}
            className="w-full flex items-center justify-between px-2.5 py-0.5 text-[9px] font-sans font-semibold tracking-widest text-[#7e828d] hover:text-[#c2c4cc] uppercase select-none transition-colors cursor-pointer group"
          >
            <span>PROFILE</span>
            <ChevronDown
              strokeWidth={2}
              className={`w-2.5 h-2.5 transition-transform duration-200 ${
                isProfileOpen ? 'rotate-180 text-[#c2c4cc]' : 'rotate-0 text-[#7e828d]'
              }`}
            />
          </button>

          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
              isProfileOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative min-h-0 overflow-hidden flex flex-col gap-1 pt-1">
              {/* Smooth Sliding Highlight Pill for PROFILE */}
              <div
                className="absolute left-0 right-0 rounded-lg bg-[#1f2023] pointer-events-none z-0"
                style={{
                  top: sectionIndicators.profile.top,
                  height: sectionIndicators.profile.height,
                  opacity: currentSection === 'profile' && isProfileOpen ? 1 : 0,
                  transition:
                    slideEnabledSection === 'profile'
                      ? 'top 200ms cubic-bezier(0.4, 0, 0.2, 1), height 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                      : 'none',
                }}
              />

              {profileNavTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left cursor-pointer select-none group ${
                      isActive
                        ? !mounted
                          ? 'bg-[#1f2023] text-white font-medium'
                          : 'text-white font-medium'
                        : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.04] font-normal'
                    }`}
                  >
                    <Icon
                      strokeWidth={1.5}
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#9ca3af] group-hover:text-white'
                      }`}
                    />
                    <span
                      className={`truncate transition-colors ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-[#9ca3af] font-normal group-hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}

              {/* Log Out Button */}
              <button
                type="button"
                onClick={() => logout()}
                className="relative z-10 w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left font-normal text-[#9ca3af] hover:text-rose-400 hover:bg-white/[0.04] cursor-pointer select-none group"
              >
                <LogOut
                  strokeWidth={1.5}
                  className="w-4 h-4 shrink-0 text-[#9ca3af] group-hover:text-rose-400 transition-colors"
                />
                <span className="truncate transition-colors text-[#9ca3af] group-hover:text-rose-400">
                  Log Out
                </span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* ============================================================== */}
      {/* 2. RIGHT CARD: WORKSPACE CONTENT                              */}
      {/* ============================================================== */}
      <main className="w-full flex-1 min-h-0 md:h-full md:min-w-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden relative">
        {/* Scrollable Tab Content Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8 md:px-9 md:pt-7 md:pb-9">
          <div className="w-full max-w-5xl space-y-6 text-left">
            {/* TAB 1: COURSES */}
            {activeTab === 'courses' && (
              <div className="space-y-6 text-left">
                {/* TUF-Style Welcome Header */}
                <div className="text-left">
                  <h1 className="text-lg sm:text-[20px] font-medium text-white tracking-normal leading-tight">
                    {greeting.title}
                  </h1>
                  <p className="text-xs sm:text-[13px] text-[#c2c4cc] mt-1">{greeting.subtitle}</p>
                </div>

                {/* Error Notice */}
                {coursesError && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1} />
                    <span>{coursesError}</span>
                  </div>
                )}

                {/* Courses Loading Skeleton */}
                {(coursesLoading || authLoading) && courses.length === 0 ? (
                  <div className="w-full md:w-fit max-w-full bg-white/5 border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start gap-5 lg:gap-6 animate-pulse select-none">
                    <div className="w-full aspect-square md:w-[135px] md:h-[135px] bg-white/10 rounded-lg shrink-0 self-start" />
                    <div className="flex-1 flex flex-col justify-start gap-3.5">
                      <div className="space-y-2">
                        <div className="h-6 w-3/5 bg-white/10 rounded" />
                        <div className="h-4 w-4/5 bg-white/5 rounded" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 w-44 bg-white/5 rounded" />
                        <div className="h-10 w-48 bg-white/10 rounded" />
                      </div>
                    </div>
                  </div>
                ) : courses.length === 0 && !coursesError ? (
                  <div className="relative w-fit max-w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-6 text-left space-y-4 transition-all select-none">
                    <div className="space-y-1.5">
                      <h2 className="text-sm sm:text-[15px] font-semibold text-white uppercase tracking-wider">
                        NO ACTIVE COURSES
                      </h2>
                      <p className="text-xs text-[#c2c4cc] leading-relaxed">
                        You are not currently enrolled in any courses. Explore our masterclass to
                        start learning.
                      </p>
                    </div>
                    <div>
                      <Link
                        href="/#pricing"
                        className="inline-flex items-center justify-center h-9 sm:h-10 px-4 sm:px-5 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg transition-colors select-none shadow-sm"
                      >
                        <span>Explore Masterclass &rarr;</span>
                      </Link>
                    </div>
                  </div>
                ) : null}

                {/* Courses List: Wide Horizontal Course Cards matching design */}
                {courses.length > 0 && (
                  <div className="w-full flex flex-col gap-5 items-start text-left">
                    {courses.map((c) => {
                      const percent = Math.min(
                        100,
                        Math.max(0, Math.round(c.progress?.percentComplete ?? 0)),
                      );

                      return (
                        <div
                          key={c.product.id}
                          className="relative w-full md:w-fit max-w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start gap-5 lg:gap-6 transition-all duration-200 select-none"
                        >
                          {/* Desktop Active Status Badge: Top right-most corner of the course card */}
                          <span className="hidden md:inline-flex absolute top-5 right-5 px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md shrink-0 select-none z-10">
                            {c.entitlement?.status || 'ACTIVE'}
                          </span>

                          {/* Course Thumbnail */}
                          <div className="relative w-full aspect-square md:w-[135px] md:h-[135px] shrink-0 self-start rounded-lg overflow-hidden bg-black/60 border border-white/[0.08] flex items-center justify-center">
                            <img
                              src="/HYDRAULIC.png"
                              alt={c.product.title}
                              className="w-full h-full object-cover select-none"
                            />
                          </div>

                          {/* Course Content Details */}
                          <div className="flex-1 flex flex-col justify-start gap-3.5 min-w-0">
                            <div>
                              {/* Course Title with mobile status badge and desktop right padding */}
                              <div className="flex items-start justify-between gap-3 md:pr-20">
                                <h2 className="text-lg sm:text-[20px] font-medium text-white tracking-tight leading-snug">
                                  <Link
                                    href={`/learn/${c.product.slug}`}
                                    className="hover:text-white/80 transition-colors"
                                  >
                                    {c.product.title}
                                  </Link>
                                </h2>
                                <span className="md:hidden px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md shrink-0 select-none">
                                  {c.entitlement?.status || 'ACTIVE'}
                                </span>
                              </div>

                              {/* Dynamic Course Description */}
                              <p className="text-xs sm:text-[13px] text-[#c2c4cc] leading-relaxed mt-1.5 sm:mt-2 line-clamp-2 md:line-clamp-none">
                                {c.product.description &&
                                !c.product.description.includes('working principles of hydraulics')
                                  ? c.product.description
                                  : 'Learn hydraulic systems, core components, and practical circuit design from the ground up.'}
                              </p>
                            </div>

                            {/* Progress Bar & Action Buttons */}
                            <div className="flex flex-col gap-3">
                              {/* Sleek Progress Bar */}
                              <div>
                                <CloseBarsProgressBar percent={percent} />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                                <Link
                                  href={`/learn/${c.product.slug}`}
                                  aria-label={percent > 0 ? 'Resume Learning' : 'Start Learning'}
                                  className="h-9 sm:h-10 px-4 sm:px-5 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg flex items-center justify-center gap-1.5 transition-colors select-none shadow-sm"
                                >
                                  <span>
                                    {percent > 0
                                      ? percent >= 90
                                        ? 'Review Course'
                                        : 'Resume Learning'
                                      : 'Start Learning'}{' '}
                                    &rarr;
                                  </span>
                                </Link>
                                <Link
                                  href={`/learn/${c.product.slug}`}
                                  className="h-9 sm:h-10 px-4 sm:px-5 bg-[#1f2023] hover:bg-white/[0.08] active:bg-white/[0.12] text-[#c2c4cc] hover:text-white border border-white/[0.08] font-medium text-xs sm:text-[13px] rounded-lg flex items-center justify-center gap-1.5 transition-colors select-none"
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

            {/* TAB 2: CREDENTIALS */}
            {activeTab === 'certificates' && (
              <div className="space-y-6 text-left">
                <div className="text-left">
                  <h1 className="text-lg sm:text-[20px] font-medium text-white tracking-normal leading-tight">
                    Credentials
                  </h1>
                  <p className="text-xs sm:text-[13px] text-[#c2c4cc] mt-1">
                    Official verified credentials of completion signed by instructor.
                  </p>
                </div>

                {completedCourses.length === 0 ? (
                  <div className="w-full flex flex-col gap-5 items-start text-left">
                    {/* Clean No-Credentials Card: Hugs text length snugly with w-fit */}
                    <div className="relative w-fit max-w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-6 text-left space-y-4 select-none">
                      <div className="space-y-1.5">
                        <h2 className="text-sm sm:text-[15px] font-semibold text-white uppercase tracking-wider">
                          No Credentials Earned Yet
                        </h2>
                        <p className="text-xs text-[#c2c4cc] leading-relaxed">
                          Complete all lesson modules in your enrolled courses to unlock your
                          verified certificates.
                        </p>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleTabChange('courses')}
                          className="h-9 sm:h-10 px-4 sm:px-5 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer select-none shadow-sm"
                        >
                          <span>Go to My Courses &rarr;</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-5 items-start text-left">
                    {completedCourses.map((c) => (
                      <div
                        key={c.product.id}
                        className="relative w-full md:w-fit max-w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start gap-5 lg:gap-6 transition-all duration-200 select-none"
                      >
                        {/* Desktop Active/Verified Badge: Top right-most corner */}
                        <span className="hidden md:inline-flex absolute top-5 right-5 px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md shrink-0 select-none z-10">
                          VERIFIED
                        </span>

                        {/* Certificate Miniature Preview Graphic */}
                        <div className="relative w-full aspect-[4/3] md:w-[180px] md:h-[135px] shrink-0 self-start rounded-lg overflow-hidden bg-gradient-to-br from-[#1c1d22] via-[#121316] to-[#0a0b0d] border border-white/[0.1] flex flex-col justify-between p-3.5 shadow-inner">
                          <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

                          {/* Top Row: Mini Certificate Header */}
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px] font-mono font-semibold tracking-wider text-emerald-400 uppercase">
                                OFFICIAL
                              </span>
                            </div>
                            <ShieldCheck className="w-3.5 h-3.5 text-white/30" />
                          </div>

                          {/* Center: Certificate Title in Miniature */}
                          <div className="relative z-10 text-center py-1">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-[#8a8c95]">
                              CERTIFICATE OF COMPLETION
                            </p>
                            <p className="text-xs font-medium text-white truncate mt-0.5 px-1">
                              {c.product.title}
                            </p>
                          </div>

                          {/* Bottom Row: Verification Code & Status */}
                          <div className="relative z-10 flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-[9px] font-mono text-[#8a8c95]">
                            <span>ID: CERT-{c.product.slug.slice(0, 6).toUpperCase()}</span>
                            <span className="text-emerald-400 font-medium">SIGNED</span>
                          </div>
                        </div>

                        {/* Credential Details & Actions */}
                        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                          <div>
                            {/* Title with mobile status badge and desktop right padding */}
                            <div className="flex items-start justify-between gap-3 md:pr-20">
                              <h2 className="text-lg sm:text-[20px] font-medium text-white tracking-tight leading-snug">
                                <Link
                                  href={`/learn/${c.product.slug}`}
                                  className="hover:text-white/80 transition-colors"
                                >
                                  {c.product.title}
                                </Link>
                              </h2>
                              <span className="md:hidden px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md shrink-0 select-none">
                                VERIFIED
                              </span>
                            </div>

                            {/* Credential Specifications */}
                            <div className="mt-2.5 space-y-1.5 text-xs sm:text-[13px] text-[#c2c4cc]">
                              <p className="flex items-center gap-2">
                                <span className="text-[#8a8c95] w-20 shrink-0">Credential:</span>
                                <span className="text-white font-medium truncate">
                                  Verified Certificate of Completion
                                </span>
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="text-[#8a8c95] w-20 shrink-0">Instructor:</span>
                                <span className="text-white font-medium">
                                  {siteConfig.instructor.name}
                                </span>
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="text-[#8a8c95] w-20 shrink-0">Status:</span>
                                <span className="text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  100% Curriculum Completed
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons: Clean text without icon */}
                          <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2.5 sm:gap-3">
                            <Link
                              href={`/learn/${c.product.slug}`}
                              className="h-9 sm:h-10 px-4 sm:px-5 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg flex items-center justify-center transition-colors select-none shadow-sm"
                            >
                              <span>Download Certificate &rarr;</span>
                            </Link>
                            <Link
                              href={`/learn/${c.product.slug}`}
                              className="h-9 sm:h-10 px-4 sm:px-5 bg-[#1f2023] hover:bg-white/[0.08] active:bg-white/[0.12] text-[#c2c4cc] hover:text-white border border-white/[0.08] font-medium text-xs sm:text-[13px] rounded-lg flex items-center justify-center transition-colors select-none"
                            >
                              <span>Review Lessons</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HYDRAULIC SYSTEM CALCULATOR */}
            {activeTab === 'calculator' && (
              <HydraulicCalculator
                activeSection={activeCalculatorSection}
                onSectionChange={handleCalculatorSubSectionChange}
              />
            )}

            {/* TAB: HYDRAULIC SYMBOLS (COMING SOON) */}
            {activeTab === 'symbols' && (
              <div className="space-y-6 text-left">
                <div className="text-left">
                  <h1 className="text-lg sm:text-[20px] font-medium text-white tracking-normal leading-tight">
                    Symbols
                  </h1>
                  <p className="text-xs sm:text-[13px] text-[#c2c4cc] mt-1">
                    Standard ISO 1219 hydraulic circuit symbols library and schematic reference.
                  </p>
                </div>

                <div className="w-full flex flex-col gap-5 items-start text-left">
                  <div className="relative w-fit max-w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-6 text-left space-y-4 select-none">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wider uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md shrink-0 select-none">
                        COMING SOON
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="text-sm sm:text-[15px] font-semibold text-white uppercase tracking-wider">
                        Hydraulic Circuit Symbols
                      </h2>
                      <p className="text-xs text-[#c2c4cc] leading-relaxed max-w-md">
                        Coming soon. We are building the interactive ISO 1219 hydraulic symbols
                        library and schematic reading tools.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS */}
            {activeTab === 'profile' && (
              <div className="space-y-6 text-left">
                <div className="text-left">
                  <h1 className="text-lg sm:text-[20px] font-medium text-white tracking-normal leading-tight">
                    Settings
                  </h1>
                  <p className="text-xs sm:text-[13px] text-[#c2c4cc] mt-1">
                    Manage your personal details, email verification, and security credentials.
                  </p>
                </div>

                {/* 2-Column Responsive Grid: Profile on Left, Password on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start w-full max-w-md lg:max-w-[720px]">
                  {/* Personal Details Card (Left) */}
                  <div className="relative w-full lg:max-w-[345px] bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl overflow-hidden text-left transition-all select-none">
                    {/* Header with border touching the ends of the box */}
                    <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center gap-2.5 bg-white/[0.02]">
                      <UserIcon className="w-4 h-4 text-white/70" strokeWidth={1.8} />
                      <h2 className="text-sm sm:text-[15px] font-semibold text-white">
                        Personal Information
                      </h2>
                    </div>

                    <div className="p-5 sm:p-6">
                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        {/* Name Input */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-name"
                            className="text-xs font-medium text-[#c2c4cc] block"
                          >
                            Full Name
                          </label>
                          <input
                            id="profile-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full h-10 px-3.5 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] rounded-lg text-xs sm:text-[13px] text-white placeholder:text-neutral-500 focus:border-white/30 outline-none focus:outline-none focus:ring-0 transition-colors"
                          />
                        </div>

                        {/* Email Address */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-email"
                            className="text-xs font-medium text-[#c2c4cc] block"
                          >
                            Email Address
                          </label>
                          <div className="relative">
                            <input
                              id="profile-email"
                              type="email"
                              readOnly
                              tabIndex={-1}
                              value={user?.email || ''}
                              className="w-full h-10 px-3.5 pr-10 bg-[#1b1c20] border border-white/[0.08] rounded-lg text-xs sm:text-[13px] text-neutral-500 cursor-not-allowed select-none focus:outline-none"
                            />
                            {user?.emailVerifiedAt && (
                              <div
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-emerald-400 select-none pointer-events-none"
                                title="Verified"
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              </div>
                            )}
                          </div>
                          {!user?.emailVerifiedAt && (
                            <div className="flex items-center gap-3 pt-1">
                              <Link
                                href={
                                  user?.email
                                    ? `/verify-email?email=${encodeURIComponent(user.email)}`
                                    : '/verify-email'
                                }
                                className="text-xs font-medium text-amber-400 hover:text-amber-300 underline"
                              >
                                Enter 6-digit OTP &rarr;
                              </Link>
                              <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={resendingVerification}
                                className="text-xs font-medium text-[#c2c4cc] hover:text-white underline cursor-pointer disabled:opacity-50"
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
                            className="text-xs font-medium text-[#c2c4cc] block"
                          >
                            Phone Number
                          </label>
                          <input
                            id="profile-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full h-10 px-3.5 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] rounded-lg text-xs sm:text-[13px] text-white placeholder:text-neutral-500 focus:border-white/30 outline-none focus:outline-none focus:ring-0 transition-colors font-mono"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="w-full h-9 sm:h-10 px-4 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Change Password Card (Right) */}
                  <div className="relative w-full lg:max-w-[345px] bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl overflow-hidden text-left transition-all select-none">
                    {/* Header with border touching the ends of the box */}
                    <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center gap-2.5 bg-white/[0.02]">
                      <Lock className="w-4 h-4 text-white/70" strokeWidth={1.8} />
                      <h2 className="text-sm sm:text-[15px] font-semibold text-white">
                        Security &amp; Password
                      </h2>
                    </div>

                    <div className="p-5 sm:p-6">
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        {passwordError && (
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                            {passwordError}
                          </div>
                        )}

                        {/* Current Password */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-current-password"
                            className="text-xs font-medium text-[#c2c4cc] block"
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
                              className="w-full h-10 px-3.5 pr-10 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] rounded-lg text-xs sm:text-[13px] text-white placeholder:text-neutral-500 focus:border-white/30 outline-none focus:outline-none focus:ring-0 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 cursor-pointer transition-colors"
                              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                            >
                              {showCurrentPassword ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-new-password"
                            className="text-xs font-medium text-[#c2c4cc] block"
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
                              className="w-full h-10 px-3.5 pr-10 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] rounded-lg text-xs sm:text-[13px] text-white placeholder:text-neutral-500 focus:border-white/30 outline-none focus:outline-none focus:ring-0 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 cursor-pointer transition-colors"
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewPassword ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5 text-left">
                          <label
                            htmlFor="profile-confirm-password"
                            className="text-xs font-medium text-[#c2c4cc] block"
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
                              className="w-full h-10 px-3.5 pr-10 bg-[#1b1c20] border border-white/[0.08] hover:border-white/[0.14] rounded-lg text-xs sm:text-[13px] text-white placeholder:text-neutral-500 focus:border-white/30 outline-none focus:outline-none focus:ring-0 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 cursor-pointer transition-colors"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={passwordSaving}
                            className="w-full h-9 sm:h-10 px-4 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{passwordSaving ? 'Updating' : 'Update Password'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PAYMENTS */}
            {activeTab === 'orders' && (
              <div className="space-y-6 text-left">
                <div className="text-left">
                  <h1 className="text-lg sm:text-[20px] font-medium text-white tracking-normal leading-tight">
                    Payments &amp; Invoices
                  </h1>
                  <p className="text-xs sm:text-[13px] text-[#c2c4cc] mt-1">
                    Download official GST tax invoices in PDF format for company or personal
                    reimbursement.
                  </p>
                </div>

                {ordersLoading ? (
                  <div className="w-full flex flex-col items-start text-left">
                    <div className="relative w-full max-w-[520px] bg-[#151619] border border-white/[0.08] rounded-xl overflow-hidden animate-pulse select-none">
                      {/* Header Bar Skeleton: Minimal order and amount placeholders */}
                      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-3 bg-white/[0.02]">
                        <div className="h-3.5 w-32 bg-white/[0.08] rounded" />
                        <div className="h-3.5 w-16 bg-white/[0.08] rounded" />
                      </div>

                      {/* Card Body Skeleton: Clean title and subtitle without heavy button blocks */}
                      <div className="p-4 sm:p-5 space-y-2.5">
                        <div className="h-4 w-3/5 bg-white/[0.08] rounded" />
                        <div className="h-3 w-28 bg-white/[0.04] rounded" />
                      </div>
                    </div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="w-full flex flex-col gap-5 items-start text-left">
                    <div className="relative w-fit max-w-full bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 sm:p-6 text-left space-y-4 select-none">
                      <div className="space-y-1.5">
                        <h2 className="text-sm sm:text-[15px] font-semibold text-white uppercase tracking-wider">
                          No Payment History Yet
                        </h2>
                        <p className="text-xs text-[#c2c4cc] leading-relaxed">
                          Once you enroll in a course, your official GST tax invoices and payment
                          receipts will appear here.
                        </p>
                      </div>
                      <div>
                        <Link
                          href="/#pricing"
                          className="h-9 sm:h-10 px-4 sm:px-5 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg inline-flex items-center justify-center transition-colors select-none shadow-sm"
                        >
                          <span>Explore Masterclass &rarr;</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-5 items-start text-left">
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
                          className="relative w-full max-w-[520px] bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl overflow-hidden transition-all duration-200 select-none text-left"
                        >
                          {/* Header Bar: Order reference, date, status, and total amount */}
                          <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-3 bg-white/[0.02]">
                            {/* Order ID & Date */}
                            <div className="flex items-center gap-2 sm:gap-2.5 text-xs text-[#c2c4cc] min-w-0">
                              <span className="font-mono font-medium text-white tracking-tight">
                                {formatDisplayOrderId(ord.orderNumber || ord.id)}
                              </span>
                              <span className="text-white/20">•</span>
                              <span className="text-[#c2c4cc] font-normal whitespace-nowrap">
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
                                className={`px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wider uppercase rounded-md shrink-0 select-none ${
                                  ord.status === 'PAID'
                                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                    : ord.status === 'FAILED'
                                      ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                      : 'text-[#c2c4cc] bg-white/5 border border-white/10'
                                }`}
                              >
                                {ord.status === 'PAID' ? 'PAID' : ord.status}
                              </span>
                              <span className="font-mono font-medium text-xs sm:text-sm text-white whitespace-nowrap">
                                ₹{amountFormatted}
                              </span>
                            </div>
                          </div>

                          {/* Card Body: Course title and action buttons */}
                          <div className="p-4 sm:p-5 space-y-4">
                            <div className="space-y-1 min-w-0">
                              <h2 className="text-sm sm:text-[15px] font-semibold text-white leading-snug">
                                {ord.product.title}
                              </h2>
                              <p className="text-xs text-[#c2c4cc]">12 Months Access</p>
                            </div>

                            {/* Actions: Download Invoice & Access Course */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 w-full">
                              {ord.invoice ? (
                                <a
                                  href={`${siteConfig.urls.api}/api/v1/invoices/${ord.invoice.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-9 sm:h-10 px-3 bg-[#1f2023] hover:bg-[#27282c] text-white border border-white/[0.08] hover:border-white/[0.16] font-medium text-xs sm:text-[13px] rounded-lg transition-colors inline-flex items-center justify-center gap-2 select-none"
                                >
                                  <Download className="w-3.5 h-3.5 text-white/70 shrink-0" />
                                  <span className="truncate">Download Invoice</span>
                                </a>
                              ) : (
                                <div className="h-9 sm:h-10 px-3 bg-white/[0.02] text-[#80828d] border border-white/[0.05] font-medium text-xs rounded-lg inline-flex items-center justify-center text-center w-full select-none">
                                  <span className="truncate">Generating Invoice...</span>
                                </div>
                              )}

                              <Link
                                href={`/learn/${ord.product.slug}`}
                                className="h-9 sm:h-10 px-4 bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-medium text-xs sm:text-[13px] rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm text-center select-none"
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
      <aside className="w-full shrink-0 md:flex-none md:w-64 lg:w-72 md:h-full md:shrink-0 bg-[#101012] rounded-xl flex flex-col overflow-hidden">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8 md:px-9 md:pt-7 md:pb-9 space-y-6">
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
