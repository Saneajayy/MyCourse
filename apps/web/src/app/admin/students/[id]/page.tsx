'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
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
    // Also fetch courses for grant access dropdown
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
      <div className="py-12 text-center text-xs font-bold text-course-navySubtle">
        Loading student record and audit history...
      </div>
    );
  }

  const student = data.student ||
    (data as any).profile || { name: 'Unknown Student', status: 'ACTIVE', id: studentId };
  const entitlements = data.entitlements || [];
  const orders = data.orders || [];
  const activeSessions = data.activeSessions || [];
  const progressSummary = data.progressSummary || {
    totalProgressRecords: (data as any).progress?.lessonsWatchedCount || 0,
    completedLessonsCount: (data as any).progress?.completedLessonsCount || 0,
    totalWatchedMinutes: Math.round(((data as any).progress?.totalWatchedSeconds || 0) / 60),
  };
  const auditLogs = data.auditLogs || [];
  const emails = (data as any).emails || [];

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-black">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="p-1.5 border border-black hover:bg-neutral-100 min-h-[36px] min-w-[36px] inline-flex items-center justify-center transition-colors"
            aria-label="Back to students list"
          >
            <ArrowLeft className="w-4 h-4 text-course-darkBlue" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 border border-black text-[10px] font-black uppercase tracking-wider ${
                  student.status === 'BANNED'
                    ? 'bg-rose-100 text-rose-950'
                    : 'bg-emerald-100 text-emerald-950'
                }`}
              >
                {student.status}
              </span>
              <span className="text-xs font-mono text-course-navySubtle">
                ID: {student.id.slice(0, 8)}...
              </span>
            </div>
            <h1 className="text-xl font-black text-course-darkBlue leading-tight mt-0.5">
              {student.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setGrantModalOpen(true)}
            className="text-xs font-black uppercase tracking-wider py-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Grant Access
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogoutModalOpen(true)}
            className="text-xs font-bold uppercase tracking-wider py-2"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Force Logout
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBanModalOpen(true)}
            className={`text-xs font-bold uppercase tracking-wider py-2 ${
              student.status === 'BANNED' ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            <Ban className="w-3.5 h-3.5 mr-1" />
            {student.status === 'BANNED' ? 'Unban Account' : 'Ban Account'}
          </Button>
        </div>
      </div>

      {/* Profile & Progress Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <Card
          variant="default"
          padding="md"
          className="border border-black md:col-span-2 space-y-3"
        >
          <h2 className="text-xs font-black text-course-darkBlue uppercase tracking-wider border-b border-black pb-2">
            Student Profile Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-course-navySubtle">
                Full Name
              </div>
              <div className="font-bold text-course-darkBlue mt-0.5">{student.name}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-course-navySubtle">
                Email Address
              </div>
              <div className="font-mono text-course-darkBlue mt-0.5 flex items-center gap-1.5">
                <span>{student.email}</span>
                {student.emailVerifiedAt ? (
                  <span title="Email Verified">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-[10px] text-course-orange font-bold hover:underline"
                    title="Resend verification email"
                  >
                    Resend
                  </button>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-course-navySubtle">
                Phone Number
              </div>
              <div className="font-mono text-course-darkBlue mt-0.5">{student.phone || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-course-navySubtle">
                Account Created
              </div>
              <div className="font-mono text-course-darkBlue mt-0.5">
                {new Date(student.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </Card>

        {/* Progress Summary Card */}
        <Card variant="default" padding="md" className="border border-black space-y-3">
          <h2 className="text-xs font-black text-course-darkBlue uppercase tracking-wider border-b border-black pb-2">
            Watch Progress
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-course-navySubtle">Lessons Completed:</span>
              <span className="font-mono font-bold text-course-darkBlue">
                {progressSummary.completedLessonsCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-course-navySubtle">Total Watched Time:</span>
              <span className="font-mono font-bold text-course-darkBlue">
                {progressSummary.totalWatchedMinutes} mins
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-course-navySubtle">Active Device Sessions:</span>
              <span className="font-mono font-bold text-course-darkBlue">
                {activeSessions.length} active
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 1: Course Entitlements */}
      <Card
        variant="default"
        padding="none"
        className="border border-black overflow-hidden space-y-0"
      >
        <div className="p-3.5 bg-neutral-100 border-b border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-course-orange" />
            <h2 className="text-xs font-black text-course-darkBlue uppercase tracking-wider">
              Enrolled Course Entitlements ({entitlements.length})
            </h2>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setGrantModalOpen(true)}
            className="text-xs py-1 px-2.5 font-bold uppercase"
          >
            Grant Course
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-black">
                <th className="p-3 font-bold text-course-darkBlue">Course Title</th>
                <th className="p-3 font-bold text-course-darkBlue">Access Source</th>
                <th className="p-3 font-bold text-course-darkBlue">Granted Date</th>
                <th className="p-3 font-bold text-course-darkBlue">Access Expiry</th>
                <th className="p-3 font-bold text-course-darkBlue">Status</th>
                <th className="p-3 font-bold text-course-darkBlue text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black bg-white">
              {entitlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-course-navySubtle italic">
                    This student does not currently hold access to any course. Click &quot;Grant
                    Course&quot; to give access.
                  </td>
                </tr>
              ) : (
                entitlements.map((ent) => (
                  <tr key={ent.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold text-course-darkBlue">{ent.product.title}</td>
                    <td className="p-3 font-mono text-[11px] text-course-navySubtle">
                      {ent.source}
                    </td>
                    <td className="p-3 font-mono text-course-navySubtle">
                      {new Date(ent.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono">
                      {ent.expiresAt ? (
                        <span className="text-course-darkBlue">
                          {new Date(ent.expiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-800">Lifetime</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 border border-black text-[9px] font-black uppercase ${
                          ent.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-950'
                            : 'bg-rose-100 text-rose-950'
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
                            className="text-xs font-bold text-course-darkBlue hover:text-course-orange hover:underline"
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
                            className="text-xs font-bold text-rose-700 hover:underline"
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
      </Card>

      {/* SECTION 2: Orders & Payments */}
      <Card
        variant="default"
        padding="none"
        className="border border-black overflow-hidden space-y-0"
      >
        <div className="p-3.5 bg-neutral-100 border-b border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-course-orange" />
            <h2 className="text-xs font-black text-course-darkBlue uppercase tracking-wider">
              Purchase History ({orders.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-black">
                <th className="p-3 font-bold text-course-darkBlue">Order ID</th>
                <th className="p-3 font-bold text-course-darkBlue">Course Package</th>
                <th className="p-3 font-bold text-course-darkBlue">Amount</th>
                <th className="p-3 font-bold text-course-darkBlue">Date</th>
                <th className="p-3 font-bold text-course-darkBlue">Status</th>
                <th className="p-3 font-bold text-course-darkBlue text-right">Invoice / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-course-navySubtle italic">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-mono text-[11px] font-bold text-course-darkBlue">
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="hover:underline hover:text-course-orange"
                      >
                        {ord.id.slice(0, 13)}...
                      </Link>
                    </td>
                    <td className="p-3 font-bold text-course-darkBlue">{ord.product.title}</td>
                    <td className="p-3 font-mono font-bold text-course-darkBlue">
                      {formatRupees(ord.totalPaise)}
                    </td>
                    <td className="p-3 font-mono text-course-navySubtle">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 border border-black text-[9px] font-black uppercase bg-neutral-100">
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="text-xs font-bold text-course-orange hover:underline"
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
      </Card>

      {/* SECTION 3: Active Device Sessions */}
      <Card
        variant="default"
        padding="none"
        className="border border-black overflow-hidden space-y-0"
      >
        <div className="p-3.5 bg-neutral-100 border-b border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-course-orange" />
            <h2 className="text-xs font-black text-course-darkBlue uppercase tracking-wider">
              Active Login &amp; Stream Sessions ({activeSessions.length})
            </h2>
          </div>
          {activeSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogoutModalOpen(true)}
              className="text-xs py-1 px-2.5 font-bold uppercase"
            >
              Terminate All
            </Button>
          )}
        </div>

        <div className="p-3 bg-white space-y-2">
          {activeSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-course-navySubtle italic">
              No active sessions currently recorded.
            </div>
          ) : (
            activeSessions.map((session) => (
              <div
                key={session.id}
                className="p-3 border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-course-darkBlue truncate">{session.userAgent}</div>
                  <div className="font-mono text-[11px] text-course-navySubtle">
                    IP Address: {session.ipAddress} • Last active:{' '}
                    {new Date(session.lastUsedAt).toLocaleString()}
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 border border-black text-[9px] font-black text-emerald-950 uppercase shrink-0">
                  Active
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* SECTION 4: User Audit Trail */}
      <Card
        variant="default"
        padding="none"
        className="border border-black overflow-hidden space-y-0"
      >
        <div className="p-3.5 bg-neutral-100 border-b border-black">
          <h2 className="text-xs font-black text-course-darkBlue uppercase tracking-wider">
            Audit Trail for this Student ({auditLogs.length} events)
          </h2>
        </div>

        <div className="p-3 bg-white space-y-1.5 text-xs max-h-60 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-xs text-course-navySubtle italic">
              No administrative audit entries logged yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 border border-neutral-200 flex items-center justify-between text-xs"
              >
                <span className="font-bold font-mono text-course-darkBlue">{log.action}</span>
                <span className="font-mono text-[11px] text-course-navySubtle">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* SECTION 5: Recent Emails Sent */}
      <Card
        variant="default"
        padding="none"
        className="border border-black overflow-hidden space-y-0"
      >
        <div className="p-3.5 bg-neutral-100 border-b border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-course-orange" />
            <h2 className="text-xs font-black text-course-darkBlue uppercase tracking-wider">
              Recent Emails Sent ({emails.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-black">
                <th className="p-3 font-bold text-course-darkBlue">Template</th>
                <th className="p-3 font-bold text-course-darkBlue">Subject</th>
                <th className="p-3 font-bold text-course-darkBlue">Status</th>
                <th className="p-3 font-bold text-course-darkBlue text-center">Attempts</th>
                <th className="p-3 font-bold text-course-darkBlue text-right">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black bg-white">
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-course-navySubtle italic">
                    No transactional emails logged for this student yet.
                  </td>
                </tr>
              ) : (
                emails.map((item: any) => {
                  let badgeBg = 'bg-neutral-100 text-neutral-800';
                  if (item.status === 'SENT') badgeBg = 'bg-emerald-100 text-emerald-950';
                  else if (item.status === 'BOUNCED' || item.status === 'COMPLAINED')
                    badgeBg = 'bg-rose-100 text-rose-950';
                  else if (item.status === 'FAILED') badgeBg = 'bg-amber-100 text-amber-950';
                  else if (item.status === 'QUEUED') badgeBg = 'bg-blue-100 text-blue-950';

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <td className="p-3 font-mono font-bold text-course-darkBlue text-[11px]">
                        {item.template}
                      </td>
                      <td
                        className="p-3 text-course-darkBlue font-medium max-w-xs truncate"
                        title={item.subject}
                      >
                        {item.subject}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 border border-black text-[9px] font-black uppercase ${badgeBg}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-center text-course-navySubtle">
                        {item.attempts}
                      </td>
                      <td className="p-3 font-mono text-right text-course-navySubtle text-[11px]">
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
      </Card>

      {/* MODAL: Grant Course Access */}
      {grantModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-course-darkBlue/75"
        >
          <div className="w-full max-w-lg bg-course-white border-2 border-black p-6 space-y-4">
            <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider border-b border-black pb-2">
              Grant Course Access Manually
            </h2>

            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="grant-course-select"
                  className="block text-xs font-bold uppercase text-course-darkBlue"
                >
                  Select Course
                </label>
                <select
                  id="grant-course-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 border border-black bg-white text-xs font-bold text-course-darkBlue"
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
                <label className="block text-xs font-bold uppercase text-course-darkBlue">
                  Access Duration
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="grantAccessType"
                      checked={grantAccessType === 'lifetime'}
                      onChange={() => setGrantAccessType('lifetime')}
                      className="accent-course-orange"
                    />
                    <span>Lifetime Access</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="grantAccessType"
                      checked={grantAccessType === 'custom'}
                      onChange={() => setGrantAccessType('custom')}
                      className="accent-course-orange"
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
                placeholder="e.g. Offline cash payment received at training facility / scholarship"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                helperText="This reason is permanently preserved in the security audit trail."
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGrantModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading}
                  className="text-xs font-black uppercase"
                >
                  Grant Access
                </Button>
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
