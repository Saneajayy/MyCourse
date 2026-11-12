'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
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
  ArrowLeft,
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-reddit">
        <div className="border border-neutral-200/80 p-8 bg-white text-center space-y-4 max-w-sm w-full shadow-sm">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent animate-spin mx-auto" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Verifying Security Credentials
            </h2>
            <p className="text-xs text-neutral-500">Checking role permissions and 2FA status...</p>
          </div>
        </div>
      </div>
    );
  }

  // /admin/2fa is the authentication challenge page (handled in its own dedicated card)
  if (pathname === '/admin/2fa') {
    return <div className="min-h-screen bg-neutral-50/50 font-reddit">{children}</div>;
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-reddit">
        <div className="border border-neutral-200/80 bg-white max-w-md w-full shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-200/80 flex items-center gap-3 bg-rose-50/50">
            <div className="w-10 h-10 bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-900">403 — Restricted Area</h1>
              <p className="text-xs text-neutral-500">Administrator role required</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              This management console is restricted to verified course administrators. Your current
              account (<strong className="font-mono text-neutral-900">{user.email}</strong>) does
              not hold the <code className="font-mono bg-neutral-100 px-1 py-0.5">ADMIN</code> role.
            </p>
            <div className="pt-2">
              <Link
                href="/my-courses"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold tracking-wide transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Student Dashboard</span>
              </Link>
            </div>
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 font-reddit">
        <div className="border border-neutral-200/80 bg-white p-8 text-center space-y-4 max-w-md w-full shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-900">2FA Enrollment Required</h2>
            <p className="text-xs text-neutral-500">
              Admin accounts must activate Two-Factor Authentication before accessing operational
              tools. Redirecting...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isExactActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-neutral-50/70 text-neutral-900 font-reddit flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
      {/* Session Inactivity Timeout Alert */}
      {sessionTimedOut && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-medium text-center border-b border-rose-700 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Your admin session timed out after 30 minutes of inactivity for security. Redirecting to
            sign in...
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile drawer toggle */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="lg:hidden p-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 min-h-[40px] min-w-[40px] inline-flex items-center justify-center transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Site Branding */}
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="flex flex-col -space-y-0.5 leading-[0.92] text-black select-none">
                <span className="font-extrabold text-[15px] sm:text-[17px] tracking-[0.02em] uppercase leading-[0.92]">
                  HYDRO
                </span>
                <span className="font-extrabold text-[15px] sm:text-[17px] tracking-[0.02em] uppercase leading-[0.92]">
                  BASICS
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-900 text-white px-1.5 py-0.5">
                CONSOLE
              </span>
            </Link>

            {/* 2FA Indicator Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-medium text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              2FA Active
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black min-h-[34px] px-2.5 py-1 border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <span>Live Store</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </Link>

            <div className="hidden sm:block text-right border-l border-neutral-200/80 pl-3">
              <div className="text-xs font-bold text-neutral-900 leading-none">{user.name}</div>
              <div className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate max-w-[180px]">
                {user.email}
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout().then(() => router.push('/login'))}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 border border-neutral-200 min-h-[34px] px-2.5 py-1 transition-colors"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-neutral-200/80 shrink-0">
          <div className="p-3.5 border-b border-neutral-200/80 bg-neutral-50/50">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              OPERATOR ROLE
            </div>
            <div className="text-xs font-bold text-neutral-900 mt-0.5 flex items-center justify-between">
              <span>Primary Administrator</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors rounded-none ${
                    active
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/70 font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-neutral-400'}`}
                  />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3.5 border-t border-neutral-200/80 bg-neutral-50/40 text-[11px] text-neutral-500 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-neutral-900">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>30m Inactivity Guard</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Session terminates automatically if inactive to safeguard payment and student
              records.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Admin Menu"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Body */}
            <div className="relative w-72 max-w-[85vw] bg-white border-r border-neutral-200 flex flex-col h-full z-10 shadow-xl">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Admin Navigation
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 border border-neutral-200 min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-neutral-600 hover:text-black"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const active = isExactActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold ${
                        active
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-neutral-400'}`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-neutral-200 bg-neutral-50 space-y-2">
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 border border-neutral-300 bg-white text-xs font-semibold text-neutral-900 hover:bg-neutral-100"
                >
                  <span>View Live Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
