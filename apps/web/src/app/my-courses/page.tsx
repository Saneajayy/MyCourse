'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient, ApiError } from '../../lib/api-client';
import {
  Loader2,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Search,
  X,
  Award,
  BookOpen,
  Check,
} from 'lucide-react';
import { ScatterCanvas } from '../../components/ui';

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

function MyCoursesNavbar({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const { logout } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Student Learning Navigation"
        className="w-full h-20 md:h-[84px] flex items-stretch justify-between"
      >
        {/* Left Side: Brand Logo + Search Bar Right Next to HYDRO BASICS */}
        <div className="flex items-center pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 gap-4 sm:gap-6 lg:gap-8 flex-1 min-w-0 pr-4">
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

          {/* Search Bar Right Next to HYDRO BASICS */}
          <div className="relative w-full max-w-[170px] xs:max-w-[210px] sm:max-w-[280px] md:max-w-[340px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              aria-label="Search courses"
              className="w-full h-9 sm:h-10 pl-9 pr-7 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-white text-white placeholder-white/60 text-xs sm:text-sm font-medium focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Account & Logout Action Cells (My Courses button removed) */}
        <div className="flex items-stretch shrink-0">
          {/* Account Profile Icon Cell */}
          <Link
            href="/account"
            className="figma-glass-divider h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Student Account Profile"
            title="Account"
          >
            <UserIcon className="w-5 h-5 text-white stroke-[2]" />
          </Link>

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
        className={`text-[#0033FF] font-medium text-[11px] sm:text-xs leading-none shrink-0 select-none ${clamped === 0 ? 'pr-1.5' : clamped === 100 ? 'pl-1.5' : 'px-1.5'
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

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'certificates'>('courses');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/my-courses');
      return;
    }

    if (!isAuthenticated) return;

    async function fetchMyCourses() {
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
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    }

    fetchMyCourses();
  }, [isAuthenticated, authLoading, router, logout]);

  // Filter courses based on user's search query in the main navbar
  const filteredCourses = courses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.product.title.toLowerCase().includes(q) ||
      c.product.slug.toLowerCase().includes(q)
    );
  });

  // Calculate completed courses for certificates tab
  const completedCourses = courses.filter(
    (c) => (c.progress?.percentComplete ?? 0) >= 100,
  );

  if (authLoading || loading) {
    return (
      <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
        <div className="noise-texture" aria-hidden="true" />
        <MyCoursesNavbar searchQuery="" setSearchQuery={() => { }} />
        <div className="w-full flex-1 flex flex-col items-center justify-center py-28 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <p className="text-sm font-semibold tracking-wider uppercase text-white/80">
            Loading Enrolled Courses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture Overlay */}
      <div className="noise-texture" aria-hidden="true" />

      {/* 3D Hydraulic Mechanism Halftone Graphic in the Right Bottom Corner (Enlarged +30%, Flipped Horizontally) */}
      <div className="absolute right-0 bottom-0 w-[117vw] sm:w-[98vw] md:w-[80vw] lg:w-[68vw] xl:w-[60vw] max-w-[1320px] min-w-[490px] pointer-events-none flex items-end justify-end z-0 translate-x-[8%] sm:translate-x-[4%] lg:translate-x-0">
        <ScatterCanvas
          dotsUrl="/mycourse2-dots.json"
          fallbackSrc="/mycourse2-pixelated.png"
          alt="Hydraulic System 3D Mechanism"
          width={3072}
          height={2048}
          rotationDeg={0}
          flipH={true}
          containerClassName="w-full h-auto aspect-[1536/1024] flex items-end justify-end -scale-x-100"
          imgClassName="w-full h-auto object-contain object-bottom-right"
          opacityClass="opacity-75 sm:opacity-85"
          priority
        />
      </div>

      {/* Spacious Floating Glass Navbar with Search Bar Right Next to Logo */}
      <MyCoursesNavbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />


      {/* Main Student Portal Content - Aligned directly under the navbar logo */}
      <main className="relative z-10 flex-1 w-full py-8 sm:py-10 md:py-12 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        {/* Header Block: STUDENT DASHBOARD. */}
        <div className="mb-5 sm:mb-6 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-4xl sm:text-5xl md:text-6xl lg:text-[72px] select-none">
            <span className="block">STUDENT</span>
            <span className="block">DASHBOARD.</span>
          </h1>
        </div>

        {/* Sub-Navbar Under Title: My Courses & My Certificates */}
        <div className="flex items-center select-none mb-8 sm:mb-10">
          <div
            role="tablist"
            aria-label="Student Dashboard Navigation"
            className="inline-flex items-stretch rounded-lg sm:rounded-xl overflow-hidden border border-white bg-transparent"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'courses'}
              onClick={() => setActiveTab('courses')}
              className={`h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'courses'
                ? 'bg-white text-[#0033FF]'
                : 'bg-transparent text-white hover:bg-white/10 active:bg-white/20'
                }`}
            >
              <BookOpen className="w-4 h-4 shrink-0 -translate-x-1 sm:-translate-x-1.5" />
              <span>My Courses</span>
            </button>

            {/* Vertical Partition Line Touching the Buttons */}
            <div className="w-px bg-white self-stretch shrink-0" aria-hidden="true" />

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'certificates'}
              onClick={() => setActiveTab('certificates')}
              className={`h-10 sm:h-11 px-5 sm:px-7 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'certificates'
                ? 'bg-white text-[#0033FF]'
                : 'bg-transparent text-white hover:bg-white/10 active:bg-white/20'
                }`}
            >
              <Award className="w-4 h-4 shrink-0 -translate-x-1 sm:-translate-x-1.5" />
              <span>My Certificates</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-8 p-4 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-100 text-sm font-bold">
            {errorMsg}
          </div>
        )}

        {/* TAB 1: MY COURSES */}
        {activeTab === 'courses' && (
          <>
            {/* Empty State: No Enrolled Courses */}
            {courses.length === 0 && !errorMsg && (
              <div className="relative w-full max-w-[420px] sm:max-w-[450px] bg-white rounded-lg sm:rounded-xl p-5 sm:p-6 select-none flex flex-col justify-between my-4">
                <div className="w-full flex flex-col justify-between text-neutral-900">
                  <div className="my-2 sm:my-3">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0033FF] tracking-tight leading-tight uppercase">
                      NO ACTIVE COURSES.
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                      You are not currently enrolled in any courses. Explore our hydraulic system basics masterclass to start learning.
                    </p>
                  </div>

                  <div className="w-full mt-4">
                    <Link
                      href="/#pricing"
                      className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-md sm:rounded-lg flex items-center justify-center transition-colors select-none gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>EXPLORE MASTERCLASS</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Empty Search Filter State */}
            {courses.length > 0 && filteredCourses.length === 0 && (
              <div className="relative w-full max-w-[420px] sm:max-w-[450px] bg-white rounded-lg sm:rounded-xl p-5 sm:p-6 select-none flex flex-col justify-between my-4">
                <div className="w-full flex flex-col justify-between text-neutral-900">
                  <div className="my-2 sm:my-3">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0033FF] tracking-tight leading-tight uppercase">
                      NO MATCHING COURSES.
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                      No courses match &ldquo;{searchQuery}&rdquo;. Try another search term or clear the search.
                    </p>
                  </div>

                  <div className="w-full mt-4">
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-md sm:rounded-lg flex items-center justify-center transition-colors select-none cursor-pointer"
                    >
                      CLEAR SEARCH
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Enrolled Courses Grid: Clean White Card with Subtle Rounded Edges */}
            {filteredCourses.length > 0 && (
              <div className="flex flex-wrap gap-6 sm:gap-8 items-start">
                {filteredCourses.map((c) => {
                  const displayPercent = c.progress?.percentComplete ?? 0;

                  return (
                    <div
                      key={c.product.id}
                      className="relative w-full max-w-[420px] sm:max-w-[450px] bg-white rounded-lg sm:rounded-xl p-5 sm:p-6 pt-5 pb-6 select-none flex flex-col justify-between"
                    >
                      {/* Card Interior Content */}
                      <div className="w-full flex flex-col">
                        {/* Expiration Date Header */}
                        <div className="mb-2 sm:mb-2.5">
                          <span className="text-[#0033FF] text-[11px] sm:text-[12px] font-medium tracking-wider uppercase select-none block">
                            {formatExpiryDate(c.entitlement?.expiresAt, c.entitlement?.isLifetime)}
                          </span>
                        </div>

                        {/* Course Thumbnail Image */}
                        <div className="relative w-full aspect-[16/10] rounded-md sm:rounded-lg overflow-hidden mb-3 sm:mb-3.5 select-none bg-neutral-100">
                          <img
                            src="/course.jpg"
                            alt={c.product.title}
                            className="w-full h-full object-cover select-none"
                          />
                        </div>

                        {/* Course Title: HYDRAULIC SYSTEM BASICS. */}
                        <h2 className="font-extrabold text-[#0033FF] uppercase text-[20px] sm:text-[22px] md:text-[23px] tracking-tight leading-tight select-none">
                          {formatCourseTitle(c.product.title)}
                        </h2>

                        {/* Progress Bar with Close Vertical Bars and Percentage Label */}
                        <CloseBarsProgressBar percent={displayPercent} />

                        {/* Full-Width Solid Blue Continue Learning Action Button */}
                        <Link
                          href={`/learn/${c.product.slug}`}
                          className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-md sm:rounded-lg flex items-center justify-center transition-colors select-none"
                        >
                          <span>CONTINUE LEARNING</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2: MY CERTIFICATES */}
        {activeTab === 'certificates' && (
          <>
            {completedCourses.length === 0 ? (
              <div className="relative w-full max-w-[450px] sm:max-w-[480px] bg-white rounded-lg sm:rounded-xl p-5 sm:p-7 select-none flex flex-col justify-between my-4">
                <div className="w-full flex flex-col justify-between text-neutral-900">
                  <div className="my-2 sm:my-3">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0033FF] tracking-tight leading-tight uppercase">
                      NO CERTIFICATES YET.
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                      Complete all modules of your enrolled course to automatically unlock your verified certificate of completion signed by instructor HiraLal.
                    </p>
                  </div>

                  <div className="w-full mt-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('courses')}
                      className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-md sm:rounded-lg flex items-center justify-center transition-colors select-none gap-2 cursor-pointer"
                    >
                      <div className="w-3.5 h-3.5" />
                      <span>VIEW MY COURSES</span>
                      <div className="w-3.5 h-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 sm:gap-8 items-start">
                {completedCourses.map((c) => (
                  <div
                    key={c.product.id}
                    className="relative w-full max-w-[420px] sm:max-w-[450px] bg-white rounded-lg sm:rounded-xl p-5 sm:p-6 pt-5 pb-6 select-none flex flex-col justify-between"
                  >
                    <div className="w-full flex flex-col">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[#0033FF] text-[11px] sm:text-[12px] font-medium tracking-wider uppercase select-none block">
                          CERTIFICATE OF COMPLETION
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                          <Check className="w-3 h-3 stroke-[3]" />
                          ISSUED
                        </span>
                      </div>

                      <div className="relative w-full aspect-[16/10] rounded-md sm:rounded-lg overflow-hidden mb-3 sm:mb-3.5 select-none bg-neutral-900 border border-[#0033FF]/15">
                        <img
                          src="/certificate.png"
                          alt="Certificate of Completion"
                          className="w-full h-full object-cover select-none"
                        />
                      </div>

                      <h2 className="font-extrabold text-[#0033FF] uppercase text-[20px] sm:text-[22px] md:text-[23px] tracking-tight leading-tight select-none">
                        {formatCourseTitle(c.product.title)}
                      </h2>
                      <p className="text-xs text-neutral-600 mt-1 font-medium">
                        Awarded to {user?.name || 'Verified Student'} for passing all course modules.
                      </p>

                      <div className="mt-4 pt-3 border-t border-neutral-200">
                        <Link
                          href={`/learn/${c.product.slug}`}
                          className="w-full h-11 sm:h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020B8] text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase rounded-md sm:rounded-lg flex items-center justify-center transition-colors select-none gap-2"
                        >
                          <Award className="w-4 h-4" />
                          <span>REVIEW COURSE &amp; CREDENTIALS</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

