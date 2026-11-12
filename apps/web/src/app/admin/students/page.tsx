'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { Search, Download, CheckCircle2, XCircle, Ban, ArrowRight, RefreshCw, X } from 'lucide-react';

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

    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/admin/export/students.csv?${params.toString()}`,
      '_blank',
    );
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-6 font-reddit">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Student Directory
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              {pagination.total} Registered
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Search registered students, inspect course enrollments, and manage access
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchStudents(pagination.page)}
            title="Refresh students"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 text-neutral-600 hover:text-neutral-950 bg-white hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Students CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="border border-neutral-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by student name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
            >
              Search
            </button>
          </form>

          {/* Status Tabs */}
          <div className="inline-flex p-0.5 border border-neutral-200/90 bg-neutral-100 text-xs shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/60'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({pagination.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/60'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('BANNED')}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                statusFilter === 'BANNED'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/60'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Banned
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/75 border-b border-neutral-200/80">
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Student Name
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Email Address
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Phone
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Email Verified
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-center">
                  Access Grants
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                  Status
                </th>
                <th className="p-3.5 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-mono">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500">
                    No students found matching your search criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5 font-semibold text-neutral-950">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="hover:underline"
                      >
                        {student.name}
                      </Link>
                    </td>

                    <td className="p-3.5 font-mono text-neutral-600">{student.email}</td>

                    <td className="p-3.5 font-mono text-neutral-500">{student.phone || '—'}</td>

                    <td className="p-3.5">
                      {student.emailVerifiedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          <XCircle className="w-3.5 h-3.5 text-amber-600" />
                          Unverified
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono font-semibold text-center text-neutral-900">
                      {student._count.entitlements} {student._count.entitlements === 1 ? 'course' : 'courses'}
                    </td>

                    <td className="p-3.5">
                      {student.status === 'BANNED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-semibold uppercase tracking-wide">
                          <Ban className="w-3 h-3 text-rose-600" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wide">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
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
          <div className="p-3.5 border-t border-neutral-200/80 bg-neutral-50/60 flex items-center justify-between text-xs">
            <span className="font-mono text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} students)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchStudents(pagination.page - 1)}
                className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 disabled:opacity-40 bg-white text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchStudents(pagination.page + 1)}
                className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 disabled:opacity-40 bg-white text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Export Modal */}
      {exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-md bg-white border border-neutral-200/90 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                  Export Students to CSV
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Stream server-generated CSV with spreadsheet formula injection protection
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
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

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
