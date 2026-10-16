'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { Card, Badge, ProgressBar } from '../../components/ui';
import { BookOpen, PlayCircle, Calendar, ArrowRight, Loader2 } from 'lucide-react';

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

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    }

    fetchMyCourses();
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-course-orange" />
        <p className="text-xs uppercase font-mono tracking-widest text-course-darkBlue">
          Loading Enrolled Courses...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-black pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-course-orange mb-1">
            Student Learning Portal
          </div>
          <h1 className="text-3xl font-black text-course-darkBlue tracking-tight">
            My Enrolled Courses
          </h1>
          <p className="text-xs md:text-sm text-course-navyMuted mt-1">
            Welcome back, <strong className="text-course-darkBlue">{user?.name}</strong>. Pick up
            where you left off.
          </p>
        </div>
        <div className="text-xs font-mono text-course-navySubtle">
          Active Enrolled Courses: <strong>{courses.length}</strong>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 border border-black bg-rose-50 text-rose-950 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* Empty State */}
      {courses.length === 0 && !errorMsg && (
        <Card variant="default" padding="lg" className="border-2 text-center py-16 space-y-4">
          <div className="w-12 h-12 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black">
            <BookOpen className="w-6 h-6 text-course-orange" />
          </div>
          <h2 className="text-xl font-black text-course-darkBlue tracking-tight">
            No Active Course Enrollments Found
          </h2>
          <p className="text-xs md:text-sm text-course-navyMuted max-w-sm mx-auto leading-relaxed">
            You are not currently enrolled in any courses. Explore our industrial hydraulic syllabus
            to get started.
          </p>
          <div className="pt-2">
            <Link href="/#pricing" className="btn-primary text-xs uppercase tracking-wide">
              Explore Masterclass
            </Link>
          </div>
        </Card>
      )}

      {/* Course List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((c) => {
          const isExpired =
            c.entitlement.remainingDays !== null && c.entitlement.remainingDays <= 0;

          return (
            <Card
              key={c.product.id}
              variant="default"
              padding="md"
              className="flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <Badge variant={isExpired ? 'error' : 'success'}>
                    {isExpired
                      ? 'Access Expired'
                      : c.entitlement.isLifetime
                        ? 'Lifetime Access'
                        : `Active • ${c.entitlement.remainingDays} Days Left`}
                  </Badge>

                  {c.entitlement.expiresAt && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-course-navySubtle">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Expires: {new Date(c.entitlement.expiresAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-black text-course-darkBlue tracking-tight mb-2">
                  {c.product.title}
                </h2>

                <div className="space-y-3 my-4">
                  <ProgressBar
                    value={c.progress.percentComplete}
                    label="Course Progress"
                    showLabel
                    size="md"
                    variant="orange"
                  />
                  <div className="flex justify-between items-center text-[11px] font-mono text-course-navyMuted">
                    <span>
                      {c.progress.completedLessons} of {c.progress.totalLessons} Lessons Completed
                    </span>
                    <span>{c.progress.percentComplete}% Complete</span>
                  </div>
                </div>

                {c.nextLesson && (
                  <div className="p-3 border border-black/20 bg-course-bg text-xs mb-4">
                    <span className="text-[10px] uppercase font-bold text-course-navyMuted block mb-0.5">
                      Up Next:
                    </span>
                    <span className="font-bold text-course-darkBlue">{c.nextLesson.title}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-black flex items-center justify-between gap-3">
                <Link
                  href={`/learn/${c.product.slug}`}
                  className="btn-primary flex-1 text-center text-xs uppercase tracking-wide py-3 flex items-center justify-center gap-2 font-bold"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Continue Learning</span>
                </Link>

                <Link
                  href={`/learn/${c.product.slug}`}
                  className="btn-outline text-xs min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  aria-label="View course details"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
