'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { Input } from '../../../../components/ui/Input';
import { useToast } from '../../../../components/ui/Toast';
import { ConfirmModal } from '../../../../components/admin/ConfirmModal';
import {
  ArrowLeft,
  ShieldCheck,
  Ban,
  LogOut,
  Plus,
  ShoppingBag,
  Laptop,
  CheckCircle2,
  Mail,
  History,
  X,
} from 'lucide-react';

interface StudentDetailResponse {
  student: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    status: 'ACTIVE' | 'BANNED';
    emailVerifiedAt: string | null;
    createdAt: string;
    lastLoginAt: string | null;
  };
  entitlements: Array<{
    id: string;
    productId: string;
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
    source: string;
    expiresAt: string | null;
    createdAt: string;
    product: {
      id: string;
      title: string;
      slug: string;
    };
  }>;
  orders: Array<{
    id: string;
    status: string;
    totalPaise: number;
    currency: string;
    paidAt: string | null;
    createdAt: string;
    product: {
      title: string;
    };
    payments: Array<{
      id: string;
      status: string;
      razorpayPaymentId: string | null;
    }>;
  }>;
  activeSessions: Array<{
    id: string;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
    lastUsedAt: string;
  }>;
  progressSummary: {
    totalProgressRecords: number;
    completedLessonsCount: number;
    totalWatchedMinutes: number;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorUserId: string | null;
  }>;
  emails?: Array<{
    id: string;
    template: string;
    subject: string;
    status: 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED' | 'COMPLAINED';
    attempts: number;
    sentAt: string | null;
    createdAt: string;
    errorMessage: string | null;
  }>;
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;

  const { success: toastSuccess, error: toastError } = useToast();

  const [data, setData] = useState<StudentDetailResponse | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Action Modals State
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState('');

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutReason, setLogoutReason] = useState('');

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [grantAccessType, setGrantAccessType] = useState<'lifetime' | 'custom'>('lifetime');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');
  const [grantReason, setGrantReason] = useState('');

  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedEntitlementId, setSelectedEntitlementId] = useState('');
  const [extendDays, setExtendDays] = useState('30');
  const [extendReason, setExtendReason] = useState('');

  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudent = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<StudentDetailResponse>(`/admin/students/${studentId}`);
      setData(res);
    } catch (err: unknown) {
      toastError('Failed to Load Student', err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [studentId, toastError]);

  useEffect(() => {
    fetchStudent();
    apiClient<Array<{ id: string; title: string }>>('/admin/products')
      .then((prods) => {
        setCourses(prods.map((p) => ({ id: p.id, title: p.title })));
        if (prods[0]) setSelectedProductId(prods[0].id);
      })
      .catch(() => {});
  }, [fetchStudent]);

  // Resend Email Verification
  const handleResendVerification = async () => {
    setActionLoading(true);
    try {
      await apiClient(`/admin/students/${studentId}/resend-verification`, { method: 'POST' });
      toastSuccess('Email Sent', 'Verification link dispatched to student email.');
    } catch (err: unknown) {
      toastError('Action Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Ban / Unban
  const handleToggleBan = async () => {
    if (!banReason.trim()) {
      toastError('Reason Required', 'Please provide an administrative reason for this action.');
      return;
    }
    setActionLoading(true);
    const shouldBan = data?.student.status !== 'BANNED';
    try {
      await apiClient(`/admin/students/${studentId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ ban: shouldBan, reason: banReason.trim() }),
      });
      toastSuccess(shouldBan ? 'Student Suspended' : 'Student Reinstated', 'Status updated.');
      setBanModalOpen(false);
      setBanReason('');
      await fetchStudent();
    } catch (err: unknown) {
      toastError('Ban Action Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Force Logout Everywhere
  const handleForceLogout = async () => {
    if (!logoutReason.trim()) {
      toastError('Reason Required', 'Please provide a reason for terminating student sessions.');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient(`/admin/students/${studentId}/force-logout`, {
        method: 'POST',
        body: JSON.stringify({ reason: logoutReason.trim() }),
      });
      toastSuccess('Sessions Terminated', 'All active streaming and login tokens invalidated.');
      setLogoutModalOpen(false);
      setLogoutReason('');
      await fetchStudent();
    } catch (err: unknown) {
      toastError('Action Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Grant Access
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantReason.trim() || !selectedProductId) {
      toastError('Required Fields Missing', 'Please select a course and provide a reason.');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient(`/admin/users/${studentId}/entitlements`, {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProductId,
          source: 'ADMIN_GRANT',
          expiresAt:
            grantAccessType === 'custom' && grantExpiresAt
              ? new Date(grantExpiresAt).toISOString()
              : null,
          reason: grantReason.trim(),
        }),
      });
      toastSuccess('Access Granted', 'Student entitlement created successfully.');
      setGrantModalOpen(false);
      setGrantReason('');
      await fetchStudent();
    } catch (err: unknown) {
      toastError('Grant Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Extend Access
  const handleExtendAccess = async () => {
    if (!extendReason.trim()) {
      toastError('Reason Required', 'Please provide a reason for extending student access.');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient(`/admin/entitlements/${selectedEntitlementId}/extend`, {
        method: 'PATCH',
        body: JSON.stringify({
          days: Number(extendDays) || 30,
          reason: extendReason.trim(),
        }),
      });
      toastSuccess('Access Extended', `Access extended by ${extendDays} days.`);
      setExtendModalOpen(false);
      setExtendReason('');
      await fetchStudent();
    } catch (err: unknown) {
      toastError('Extend Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke Access
  const handleRevokeAccess = async () => {
    if (!revokeReason.trim()) {
      toastError('Reason Required', 'Please provide a reason for revoking student access.');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient(`/admin/entitlements/${selectedEntitlementId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({
          reason: revokeReason.trim(),
        }),
      });
      toastSuccess('Access Revoked', 'Course entitlement has been revoked.');
      setRevokeModalOpen(false);
      setRevokeReason('');
      await fetchStudent();
    } catch (err: unknown) {
      toastError('Revoke Failed', err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  if (isLoading || !data) {
    return (
      <div className="py-16 text-center text-xs font-mono text-neutral-500 font-reddit">
        Loading student record and audit history...
      </div>
    );
  }

  const student = data.student ||
    (data as unknown as { profile?: typeof data.student }).profile || {
      name: 'Unknown Student',
      status: 'ACTIVE' as const,
      id: studentId,
      email: '',
      phone: null,
      role: 'STUDENT',
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
  const entitlements = data.entitlements || [];
  const orders = data.orders || [];
  const activeSessions = data.activeSessions || [];
  const progressSummary = data.progressSummary || {
    totalProgressRecords: 0,
    completedLessonsCount: 0,
    totalWatchedMinutes: 0,
  };
  const auditLogs = data.auditLogs || [];
  const emails = data.emails || [];

  return (
    <div className="space-y-6 font-reddit">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-700 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
            aria-label="Back to students list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 border text-[10px] font-semibold tracking-wide uppercase ${
                  student.status === 'BANNED'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {student.status}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                ID: {student.id.slice(0, 8)}...
              </span>
            </div>
            <h1 className="text-lg font-bold text-neutral-950 mt-1">
              {student.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setGrantModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Grant Access</span>
          </button>

          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Force Logout</span>
          </button>

          <button
            type="button"
            onClick={() => setBanModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 border text-xs font-semibold tracking-wide transition-colors ${
              student.status === 'BANNED'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                : 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>{student.status === 'BANNED' ? 'Unban Account' : 'Ban Account'}</span>
          </button>
        </div>
      </div>

      {/* Profile & Progress Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="border border-neutral-200/80 bg-white p-5 shadow-xs md:col-span-2 space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-2">
            Student Profile Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-semibold text-neutral-400">
                Full Name
              </div>
              <div className="font-semibold text-neutral-950 mt-0.5">{student.name}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-neutral-400">
                Email Address
              </div>
              <div className="font-mono text-neutral-900 mt-0.5 flex items-center gap-1.5">
                <span>{student.email}</span>
                {student.emailVerifiedAt ? (
                  <span title="Email Verified">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-[10px] text-neutral-900 font-semibold hover:underline"
                    title="Resend verification email"
                  >
                    Resend
                  </button>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-neutral-400">
                Phone Number
              </div>
              <div className="font-mono text-neutral-900 mt-0.5">{student.phone || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-neutral-400">
                Account Created
              </div>
              <div className="font-mono text-neutral-900 mt-0.5">
                {new Date(student.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Summary Card */}
        <div className="border border-neutral-200/80 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-2">
            Watch Telemetry
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500">Lessons Completed:</span>
              <span className="font-mono font-semibold text-neutral-950">
                {progressSummary.completedLessonsCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Watched Time:</span>
              <span className="font-mono font-semibold text-neutral-950">
                {progressSummary.totalWatchedMinutes} mins
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Active Device Sessions:</span>
              <span className="font-mono font-semibold text-neutral-950">
                {activeSessions.length} active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Course Entitlements */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 bg-neutral-50/75 border-b border-neutral-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              Enrolled Course Entitlements ({entitlements.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setGrantModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Grant Course</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-200/80">
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Course Title</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Access Source</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Granted Date</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Access Expiry</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Status</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {entitlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-neutral-500 italic">
                    This student does not currently hold access to any course. Click &quot;Grant Course&quot; to provide access.
                  </td>
                </tr>
              ) : (
                entitlements.map((ent) => (
                  <tr key={ent.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3 font-semibold text-neutral-950">{ent.product.title}</td>
                    <td className="p-3 font-mono text-[11px] text-neutral-500">
                      {ent.source}
                    </td>
                    <td className="p-3 font-mono text-neutral-500 text-[11px]">
                      {new Date(ent.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {ent.expiresAt ? (
                        <span className="text-neutral-900">
                          {new Date(ent.expiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-800">Lifetime</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-wider ${
                          ent.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {ent.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {ent.status === 'ACTIVE' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntitlementId(ent.id);
                              setExtendModalOpen(true);
                            }}
                            className="text-xs font-semibold text-neutral-900 hover:underline"
                          >
                            Extend
                          </button>
                          <span className="text-neutral-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntitlementId(ent.id);
                              setRevokeModalOpen(true);
                            }}
                            className="text-xs font-semibold text-rose-700 hover:underline"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Orders & Payments */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 bg-neutral-50/75 border-b border-neutral-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-neutral-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              Purchase History ({orders.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-200/80">
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Order ID</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Course Package</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Amount</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Date</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Status</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-neutral-500 italic">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3 font-mono text-[11px] font-semibold text-neutral-950">
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="hover:underline"
                      >
                        {ord.id.slice(0, 13)}...
                      </Link>
                    </td>
                    <td className="p-3 font-medium text-neutral-900">{ord.product.title}</td>
                    <td className="p-3 font-mono font-semibold text-neutral-950">
                      {formatRupees(ord.totalPaise)}
                    </td>
                    <td className="p-3 font-mono text-neutral-500 text-[11px]">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 border border-neutral-200 text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-700">
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="text-xs font-semibold text-neutral-900 hover:underline"
                      >
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Active Device Sessions */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 bg-neutral-50/75 border-b border-neutral-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-neutral-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
              Active Streaming &amp; Device Sessions ({activeSessions.length})
            </h2>
          </div>
          {activeSessions.length > 0 && (
            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              className="px-2.5 py-1 border border-neutral-300 hover:border-neutral-900 text-neutral-800 text-xs font-semibold tracking-wide transition-colors"
            >
              Terminate All
            </button>
          )}
        </div>

        <div className="p-3 bg-white space-y-2">
          {activeSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-500 italic">
              No active device sessions recorded.
            </div>
          ) : (
            activeSessions.map((session) => (
              <div
                key={session.id}
                className="p-3 border border-neutral-200/80 bg-neutral-50/40 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-neutral-900 truncate">{session.userAgent}</div>
                  <div className="font-mono text-[11px] text-neutral-500">
                    IP Address: {session.ipAddress} • Last active:{' '}
                    {new Date(session.lastUsedAt).toLocaleString()}
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800 uppercase shrink-0">
                  Active
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 4: User Audit Trail */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 bg-neutral-50/75 border-b border-neutral-200/80 flex items-center gap-2">
          <History className="w-4 h-4 text-neutral-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
            Audit Trail for this Student ({auditLogs.length} events)
          </h2>
        </div>

        <div className="p-3 bg-white space-y-1.5 text-xs max-h-60 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-500 italic">
              No administrative audit entries logged yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 border border-neutral-200/70 bg-neutral-50/30 flex items-center justify-between text-xs"
              >
                <span className="font-mono font-medium text-neutral-900">{log.action}</span>
                <span className="font-mono text-[11px] text-neutral-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 5: Recent Emails Sent */}
      <div className="border border-neutral-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 bg-neutral-50/75 border-b border-neutral-200/80 flex items-center gap-2">
          <Mail className="w-4 h-4 text-neutral-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
            Recent Emails Dispatched ({emails.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-200/80">
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Template</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Subject</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Status</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-center">Attempts</th>
                <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-neutral-500 italic">
                    No transactional emails logged for this student yet.
                  </td>
                </tr>
              ) : (
                emails.map((item) => {
                  let badgeCls = 'bg-neutral-100 text-neutral-800 border-neutral-200';
                  if (item.status === 'SENT') badgeCls = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  else if (item.status === 'BOUNCED' || item.status === 'COMPLAINED')
                    badgeCls = 'bg-rose-50 text-rose-800 border-rose-200';
                  else if (item.status === 'FAILED') badgeCls = 'bg-amber-50 text-amber-800 border-amber-200';
                  else if (item.status === 'QUEUED') badgeCls = 'bg-sky-50 text-sky-800 border-sky-200';

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3 font-mono font-medium text-neutral-900 text-[11px]">
                        {item.template}
                      </td>
                      <td
                        className="p-3 text-neutral-800 font-medium max-w-xs truncate"
                        title={item.subject}
                      >
                        {item.subject}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-wider ${badgeCls}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-center text-neutral-500">
                        {item.attempts}
                      </td>
                      <td className="p-3 font-mono text-right text-neutral-500 text-[11px]">
                        {item.sentAt
                          ? new Date(item.sentAt).toLocaleString()
                          : new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Grant Course Access */}
      {grantModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-lg bg-white border border-neutral-200/90 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                Grant Course Access Manually
              </h2>
              <button
                type="button"
                onClick={() => setGrantModalOpen(false)}
                className="p-1 border border-neutral-200 hover:border-neutral-900 text-neutral-500 hover:text-neutral-900 min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="grant-course-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                >
                  Select Course
                </label>
                <select
                  id="grant-course-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 bg-white text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
                  aria-label="Select Course to Grant"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Access Duration
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-neutral-900">
                    <input
                      type="radio"
                      name="grantAccessType"
                      checked={grantAccessType === 'lifetime'}
                      onChange={() => setGrantAccessType('lifetime')}
                      className="accent-neutral-900"
                    />
                    <span>Lifetime Access</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-neutral-900">
                    <input
                      type="radio"
                      name="grantAccessType"
                      checked={grantAccessType === 'custom'}
                      onChange={() => setGrantAccessType('custom')}
                      className="accent-neutral-900"
                    />
                    <span>Custom Expiry Date</span>
                  </label>
                </div>
              </div>

              {grantAccessType === 'custom' && (
                <Input
                  label="Expiry Date"
                  type="date"
                  required
                  value={grantExpiresAt}
                  onChange={(e) => setGrantExpiresAt(e.target.value)}
                />
              )}

              <Input
                label="Reason for Grant (Required for Audit Log)"
                type="text"
                required
                placeholder="e.g. Offline cash payment received / institutional scholarship"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                helperText="Preserved in the permanent security audit trail."
              />

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Extend Access */}
      {extendModalOpen && (
        <ConfirmModal
          isOpen={true}
          title="Extend Course Access"
          description="Add additional days of video streaming access to this student's course entitlement."
          confirmText="Extend Access"
          isDestructive={false}
          isLoading={actionLoading}
          onConfirm={handleExtendAccess}
          onClose={() => setExtendModalOpen(false)}
        >
          <div className="space-y-3">
            <Input
              label="Days to Add"
              type="number"
              min="1"
              required
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
            />
            <Input
              label="Reason for Extension (Required)"
              type="text"
              required
              placeholder="e.g. Student requested exam preparation extension"
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
            />
          </div>
        </ConfirmModal>
      )}

      {/* MODAL: Revoke Access */}
      {revokeModalOpen && (
        <ConfirmModal
          isOpen={true}
          title="Revoke Course Access"
          description="Revoking access will immediately cut off this student from streaming paid video lessons in this course."
          confirmText="Revoke Access"
          isDestructive={true}
          isLoading={actionLoading}
          onConfirm={handleRevokeAccess}
          onClose={() => setRevokeModalOpen(false)}
        >
          <Input
            label="Reason for Revocation (Required for Audit Log)"
            type="text"
            required
            placeholder="e.g. Fraudulent transaction or chargeback initiated"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
          />
        </ConfirmModal>
      )}

      {/* MODAL: Ban / Unban Account */}
      {banModalOpen && (
        <ConfirmModal
          isOpen={true}
          title={student.status === 'BANNED' ? 'Unban Student Account' : 'Ban Student Account'}
          description={
            student.status === 'BANNED'
              ? "Unbanning will restore this student's ability to sign in to their account."
              : 'Banning this student will immediately revoke active sessions and block sign-in.'
          }
          confirmText={student.status === 'BANNED' ? 'Reinstate Account' : 'Ban Student'}
          isDestructive={student.status !== 'BANNED'}
          isLoading={actionLoading}
          onConfirm={handleToggleBan}
          onClose={() => setBanModalOpen(false)}
        >
          <Input
            label="Administrative Reason (Required for Audit Trail)"
            type="text"
            required
            placeholder="e.g. Account sharing violation or suspicious activity detected"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
        </ConfirmModal>
      )}

      {/* MODAL: Force Logout Everywhere */}
      {logoutModalOpen && (
        <ConfirmModal
          isOpen={true}
          title="Force Logout Everywhere"
          description="This will terminate all active streaming and login sessions across all devices for this student. The student must sign in again."
          confirmText="Terminate All Sessions"
          isDestructive={true}
          isLoading={actionLoading}
          onConfirm={handleForceLogout}
          onClose={() => setLogoutModalOpen(false)}
        >
          <Input
            label="Reason for Forced Logout (Required)"
            type="text"
            required
            placeholder="e.g. Student reported compromised browser / device reset"
            value={logoutReason}
            onChange={(e) => setLogoutReason(e.target.value)}
          />
        </ConfirmModal>
      )}
    </div>
  );
}
