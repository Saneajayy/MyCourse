'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  Tag,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  ExternalLink,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Revenue, orders, student metrics, and alerts',
  },
  {
    label: 'Courses',
    href: '/admin/courses',
    icon: BookOpen,
    description: 'Manage courses, curriculum, pricing, and video lessons',
  },
  {
    label: 'Students',
    href: '/admin/students',
    icon: Users,
    description: 'Student directory, grant access, ban, and active sessions',
  },
  {
    label: 'Orders & Payments',
    href: '/admin/orders',
    icon: CreditCard,
    description: 'Order records, invoices, UTM attribution, and refunds',
  },
  {
    label: 'Coupons',
    href: '/admin/coupons',
    icon: Tag,
    description: 'Discount codes, usage limits, and promotions',
  },
  {
    label: 'Store Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Business name, GSTIN, tax rates, and stream limits',
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: ShieldAlert,
    description: 'Read-only log of all admin modifications and actions',
  },
];

// Admin session inactivity timeout: 30 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  // Inactivity detection & automatic logout
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const inactiveDuration = Date.now() - lastActivityRef.current;
      if (inactiveDuration >= INACTIVITY_TIMEOUT_MS && !sessionTimedOut) {
        setSessionTimedOut(true);
        logout().finally(() => {
          router.push('/login?reason=timeout');
        });
      }
    }, 15000); // Check every 15 seconds

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [handleUserActivity, logout, router, sessionTimedOut]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Authentication & 2FA Enforcement Guard
  if (isLoading) {
    return (
      <div className="min-h-screen bg-course-white flex items-center justify-center p-6">
        <div className="border border-black p-8 bg-course-white text-center space-y-3 max-w-sm w-full">
          <div className="w-8 h-8 border-2 border-course-orange border-t-transparent animate-spin mx-auto" />
          <h2 className="text-sm font-black uppercase tracking-wider text-course-darkBlue">
            Verifying Admin Security
          </h2>
          <p className="text-xs text-course-navySubtle">
            Checking role permissions and 2FA status...
          </p>
        </div>
      </div>
    );
  }

  // /admin/2fa is the authentication challenge page (accessed with tempToken before full login)
  if (pathname === '/admin/2fa') {
    return (
      <div className="min-h-screen bg-course-white flex items-center justify-center p-6">
        {children}
      </div>
    );
  }

  // Not logged in -> Redirect to login
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
    return null;
  }

  // Non-admin -> 403 Access Denied
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-course-white flex items-center justify-center p-6">
        <div className="border-2 border-black p-8 bg-course-white text-center space-y-4 max-w-md w-full">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 border border-black flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-course-darkBlue">403 — Admin Access Required</h1>
          <p className="text-xs text-course-navyMuted leading-relaxed">
            This administration panel is restricted to verified course administrators. Your current
            account ({user.email}) does not hold the ADMIN role.
          </p>
          <div className="pt-2">
            <Link href="/my-courses">
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs font-bold uppercase tracking-wider"
              >
                Return to Student Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin without 2FA -> Must enroll before accessing admin panel
  if (!user.twoFactorEnabled && pathname !== '/admin/2fa') {
    if (typeof window !== 'undefined') {
      router.push('/admin/2fa');
    }
    return (
      <div className="min-h-screen bg-course-white flex items-center justify-center p-6">
        <div className="border-2 border-black p-8 bg-course-white text-center space-y-4 max-w-md w-full">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 border border-black flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-course-darkBlue">2FA Enrollment Required</h2>
          <p className="text-xs text-course-navyMuted">
            Admin accounts must have Two-Factor Authentication activated. Redirecting to setup
            wizard...
          </p>
        </div>
      </div>
    );
  }

  // If on /admin/2fa, render content without standard admin sidebar
  if (pathname === '/admin/2fa') {
    return <main className="min-h-screen bg-course-white">{children}</main>;
  }

  const isExactActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-course-darkBlue flex flex-col">
      {/* Session Inactivity Timeout Banner */}
      {sessionTimedOut && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold text-center border-b border-black flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Your admin session has timed out after 30 minutes of inactivity for security.
            Redirecting to sign in...
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-course-white border-b border-black">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <div className="flex items-center gap-3">
            {/* Mobile drawer toggle button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="lg:hidden p-2 border border-black hover:bg-neutral-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Site Branding */}
            <Link href="/admin" className="flex items-center gap-2">
              <span className="w-7 h-7 bg-course-darkBlue text-white font-black text-xs border border-black flex items-center justify-center">
                HE
              </span>
              <span className="font-black text-sm text-course-darkBlue uppercase tracking-wider">
                Admin Panel
              </span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-black text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              2FA Active
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-course-darkBlue hover:text-course-orange min-h-[36px] px-3 border border-black hover:bg-neutral-50 transition-colors"
            >
              <span>View Live Store</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-course-darkBlue leading-none">{user.name}</div>
              <div className="text-[10px] text-course-navySubtle font-mono mt-0.5">
                {user.email}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout().then(() => router.push('/login'))}
              className="text-xs font-bold uppercase tracking-wider py-1.5 px-3 min-h-[36px]"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (visible on laptop width >= 1024px) */}
        <aside className="hidden lg:flex flex-col w-64 bg-course-white border-r border-black shrink-0">
          <div className="p-4 border-b border-black bg-neutral-50">
            <div className="text-[10px] font-mono uppercase tracking-wider text-course-navySubtle">
              Operating Mode
            </div>
            <div className="text-xs font-black text-course-darkBlue mt-0.5">
              Solo Operator Console
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Admin Navigation">
            {NAV_ITEMS.map((item) => {
              const active = isExactActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 border text-xs font-bold transition-colors min-h-[44px] ${
                    active
                      ? 'bg-course-darkBlue text-white border-black'
                      : 'border-transparent text-course-darkBlue hover:border-black hover:bg-neutral-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${active ? 'text-course-orange' : 'text-course-navySubtle'}`}
                  />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-black bg-neutral-50 text-[11px] text-course-navySubtle space-y-1">
            <div className="flex items-center gap-1 font-bold text-course-darkBlue">
              <Clock className="w-3 h-3 text-course-navySubtle" />
              <span>Session Inactivity Timer</span>
            </div>
            <p className="text-[10px] leading-tight">
              Auto-logout triggers after 30 minutes of inactivity to safeguard payment and student
              records.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer (slide-in / overlay on phone width < 1024px) */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Admin Menu"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-course-darkBlue/75"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Body */}
            <div className="relative w-72 max-w-[80vw] bg-course-white border-r-2 border-black flex flex-col h-full z-10">
              <div className="p-4 border-b border-black flex items-center justify-between bg-neutral-50">
                <span className="text-xs font-black text-course-darkBlue uppercase tracking-wider">
                  Admin Navigation
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 border border-black min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const active = isExactActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 border text-xs font-bold min-h-[44px] ${
                        active
                          ? 'bg-course-darkBlue text-white border-black'
                          : 'border-black text-course-darkBlue bg-course-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? 'text-course-orange' : 'text-course-navySubtle'}`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-black bg-neutral-50 space-y-2">
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 border border-black bg-course-white text-xs font-bold uppercase tracking-wider"
                >
                  <span>View Live Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
