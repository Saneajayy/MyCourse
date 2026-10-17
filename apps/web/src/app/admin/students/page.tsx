'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { Search, Download, CheckCircle2, XCircle, Ban, ArrowRight } from 'lucide-react';

interface StudentListItem {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: 'ACTIVE' | 'BANNED';
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    entitlements: number;
    orders: number;
  };
}

interface StudentsResponse {
  items: StudentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // CSV Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const { error: toastError } = useToast();

  const fetchStudents = useCallback(
    async (page = 1, query = searchQuery, status = statusFilter) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
        });
        if (query.trim()) params.set('search', query.trim());
        if (status !== 'ALL') params.set('status', status);

        const res = await apiClient<StudentsResponse>(`/admin/students?${params.toString()}`);
        setStudents(res.items);
        setPagination(res.pagination);
      } catch (err: unknown) {
        toastError('Failed to Load Students', err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, statusFilter, toastError],
  );

  useEffect(() => {
    fetchStudents(1, searchQuery, statusFilter);
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(1, searchQuery, statusFilter);
  };

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    if (exportStartDate) params.set('startDate', exportStartDate);
    if (exportEndDate) params.set('endDate', exportEndDate);

    // Stream download protected from formula injection
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/admin/export/students.csv?${params.toString()}`,
      '_blank',
    );
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-black">
        <div>
          <h1 className="text-2xl font-black text-course-darkBlue uppercase tracking-tight">
            Student Directory
          </h1>
          <p className="text-xs text-course-navySubtle mt-0.5">
            Search registered students, inspect course enrollments, and manage access
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExportModalOpen(true)}
          className="text-xs font-bold uppercase tracking-wider py-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Students CSV
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="default" padding="md" className="border border-black">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by student name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-black bg-white text-xs text-course-darkBlue focus:outline-none focus:ring-2 focus:ring-course-orange"
              />
              <Search className="w-4 h-4 text-course-navySubtle absolute left-2.5 top-2.5" />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="text-xs font-bold uppercase px-4"
            >
              Search
            </Button>
          </form>

          {/* Status Tabs */}
          <div className="inline-flex border border-black bg-course-white shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold uppercase min-h-[36px] ${
                statusFilter === 'ALL'
                  ? 'bg-course-darkBlue text-white'
                  : 'text-course-darkBlue hover:bg-neutral-100'
              }`}
            >
              All ({pagination.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-bold uppercase border-l border-black min-h-[36px] ${
                statusFilter === 'ACTIVE'
                  ? 'bg-course-darkBlue text-white'
                  : 'text-course-darkBlue hover:bg-neutral-100'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('BANNED')}
              className={`px-3 py-1.5 text-xs font-bold uppercase border-l border-black min-h-[36px] ${
                statusFilter === 'BANNED'
                  ? 'bg-course-darkBlue text-white'
                  : 'text-course-darkBlue hover:bg-neutral-100'
              }`}
            >
              Banned
            </button>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card variant="default" padding="none" className="border border-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-100 border-b border-black">
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Student Name
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Email Address
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Phone
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Email Verified
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider text-center">
                  Access Grants
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                  Account Status
                </th>
                <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-course-navySubtle font-bold">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-course-navySubtle">
                    No students found matching your search criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-bold text-course-darkBlue">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="hover:text-course-orange hover:underline font-black"
                      >
                        {student.name}
                      </Link>
                    </td>

                    <td className="p-3 font-mono text-course-navyMuted">{student.email}</td>

                    <td className="p-3 font-mono text-course-navySubtle">{student.phone || '—'}</td>

                    <td className="p-3">
                      {student.emailVerifiedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <XCircle className="w-3.5 h-3.5" />
                          Unverified
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-mono font-bold text-center text-course-darkBlue">
                      {student._count.entitlements} courses
                    </td>

                    <td className="p-3">
                      {student.status === 'BANNED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-950 border border-black text-[10px] font-black uppercase tracking-wider">
                          <Ban className="w-3 h-3 text-rose-700" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-black text-[10px] font-black uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-course-orange hover:underline"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-black bg-neutral-50 flex items-center justify-between text-xs">
            <span className="font-mono text-course-navySubtle">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} students)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchStudents(pagination.page - 1)}
                className="text-xs py-1"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchStudents(pagination.page + 1)}
                className="text-xs py-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* CSV Export Modal */}
      {exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-course-darkBlue/75"
        >
          <div className="w-full max-w-md bg-course-white border-2 border-black p-6 space-y-4">
            <div className="border-b border-black pb-2">
              <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
                Export Students to CSV
              </h2>
              <p className="text-xs text-course-navySubtle mt-0.5">
                Stream server-generated CSV with spreadsheet formula injection protection
              </p>
            </div>

            <div className="space-y-3">
              <Input
                label="Registered After (Optional)"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
              <Input
                label="Registered Before (Optional)"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportModalOpen(false)}
                className="text-xs font-bold uppercase"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadCsv}
                className="text-xs font-black uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
