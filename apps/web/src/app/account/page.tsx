'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { siteConfig } from '../../config/site';
import { Card, Button, Input, Badge, Tabs, useToast } from '../../components/ui';
import {
  User as UserIcon,
  Shield,
  Laptop,
  Receipt,
  Download,
  AlertCircle,
  MailCheck,
  Loader2,
  Trash2,
} from 'lucide-react';

interface SessionData {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

interface OrderHistoryItem {
  id: string;
  orderNumber?: string;
  status: string;
  amountPaise: number;
  currency: string;
  createdAt: string;
  product: {
    title: string;
    slug: string;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser, logout } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'sessions' | 'orders'>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  // Load Sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiClient<{ sessions: SessionData[] }>('/sessions');
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      toastError('Failed to load sessions', err instanceof Error ? err.message : 'Error');
    } finally {
      setSessionsLoading(false);
    }
  }, [toastError]);

  // Load Orders
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
      if (activeTab === 'sessions') {
        loadSessions();
      } else if (activeTab === 'orders') {
        loadOrders();
      }
    }
  }, [activeTab, isAuthenticated, loadSessions, loadOrders]);

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await apiClient('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      await refreshUser();
      toastSuccess('Profile Updated', 'Your student details were saved successfully.');
    } catch (err: unknown) {
      toastError('Save Failed', err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 10) {
      setPasswordError('New password must be at least 10 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
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
      toastSuccess('Password Changed', 'Your account password has been updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(msg);
      toastError('Password Change Failed', msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Resend Email Verification
  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await apiClient('/auth/resend-verification', { method: 'POST' });
      toastSuccess('Verification Sent', 'Please check your inbox for the link.');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Could not send verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  // Revoke Individual Session
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await apiClient(`/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toastSuccess('Session Revoked', 'Device has been logged out.');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Log Out Everywhere
  const handleLogoutEverywhere = async () => {
    setLoggingOutAll(true);
    try {
      await apiClient('/auth/logout-all', { method: 'POST' });
      toastSuccess('Logged Out Everywhere', 'All active sessions have been invalidated.');
      await logout();
      router.push('/login');
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Failed to logout everywhere');
      setLoggingOutAll(false);
    }
  };

  if (authLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-course-orange" />
        <p className="text-xs uppercase font-mono tracking-widest text-course-darkBlue">
          Loading Account Profile...
        </p>
      </div>
    );
  }

  const tabsList = [
    { id: 'profile', label: 'Profile & Security' },
    { id: 'sessions', label: 'Active Devices', count: sessions.length || undefined },
    { id: 'orders', label: 'Order History', count: orders.length || undefined },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Title */}
      <div className="border-b border-black pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-course-orange mb-1">
            Student Management
          </div>
          <h1 className="text-3xl font-black text-course-darkBlue tracking-tight">
            Account &amp; Security Settings
          </h1>
          <p className="text-xs md:text-sm text-course-navyMuted mt-1">
            Manage your credentials, active devices, and tax invoices
          </p>
        </div>

        <div>
          <Badge variant={user?.emailVerifiedAt ? 'success' : 'error'}>
            {user?.emailVerifiedAt ? 'Email Verified' : 'Email Unverified'}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        tabs={tabsList}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as 'profile' | 'sessions' | 'orders')}
      />

      {/* TAB 1: Profile & Security */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Details */}
          <Card variant="default">
            <div className="flex items-center gap-2 mb-6">
              <UserIcon className="w-5 h-5 text-course-orange" />
              <h2 className="text-lg font-black text-course-darkBlue uppercase tracking-tight">
                Profile Details
              </h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                helperText="Printed on completion certificate"
              />

              <Input
                label="Registered Email"
                value={user?.email || ''}
                disabled
                helperText="Primary email cannot be changed directly"
              />

              {!user?.emailVerifiedAt && (
                <div className="p-3 border border-black bg-amber-50 text-xs text-amber-950 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Your email is not verified yet.</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleResendVerification}
                    isLoading={resendingVerification}
                  >
                    <MailCheck className="w-3.5 h-3.5 mr-1.5" />
                    Resend Verification Email
                  </Button>
                </div>
              )}

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="Used for transaction SMS and notifications"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs"
                isLoading={profileSaving}
              >
                Save Changes
              </Button>
            </form>
          </Card>

          {/* Change Password */}
          <Card variant="default">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-course-orange" />
              <h2 className="text-lg font-black text-course-darkBlue uppercase tracking-tight">
                Change Password
              </h2>
            </div>

            {passwordError && (
              <div className="p-3 border border-black bg-rose-50 text-rose-950 text-xs font-bold mb-4">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••••••"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Min 10 characters"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Must be at least 10 characters long"
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs"
                isLoading={passwordSaving}
              >
                Update Password
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 2: Active Devices / Sessions */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-black p-4 bg-course-orangeSubtle">
            <div>
              <h3 className="font-bold text-sm text-course-darkBlue">
                Logged-In Devices &amp; Sessions
              </h3>
              <p className="text-xs text-course-navyMuted mt-0.5">
                For security, single-stream playback is enforced. You can revoke any unrecognized
                device.
              </p>
            </div>
            <Button
              variant="dark"
              size="sm"
              onClick={handleLogoutEverywhere}
              isLoading={loggingOutAll}
            >
              Log Out Everywhere
            </Button>
          </div>

          {sessionsLoading ? (
            <div className="p-12 text-center text-xs font-mono uppercase">
              Loading active sessions...
            </div>
          ) : sessions.length === 0 ? (
            <Card variant="default" className="text-center py-12">
              <p className="text-xs text-course-navyMuted">No active session records found.</p>
            </Card>
          ) : (
            <div className="border border-black bg-course-white overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-black bg-course-bg text-course-darkBlue uppercase font-mono">
                  <tr>
                    <th className="p-3">Device / Browser</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-course-orangeSubtle/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-course-orange shrink-0" />
                          <div>
                            <div className="font-bold text-course-darkBlue truncate max-w-xs">
                              {sess.userAgent || 'Unknown Browser / Platform'}
                            </div>
                            {sess.isCurrent && (
                              <Badge variant="orangeSubtle" size="sm" className="mt-1">
                                Current Session
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-course-navySubtle">
                        {sess.ipAddress || '—'}
                      </td>
                      <td className="p-3 font-mono text-course-navySubtle">
                        {new Date(sess.lastUsedAt).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] py-1 px-2.5"
                          disabled={revokingSessionId === sess.id}
                          onClick={() => handleRevokeSession(sess.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                          <span>Revoke</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Order History & Invoices */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="border border-black p-4 bg-course-bg">
            <h3 className="font-bold text-sm text-course-darkBlue">
              Purchase &amp; Invoice History
            </h3>
            <p className="text-xs text-course-navyMuted mt-0.5">
              Official GST tax invoices can be downloaded directly in PDF format for company expense
              reimbursement.
            </p>
          </div>

          {ordersLoading ? (
            <div className="p-12 text-center text-xs font-mono uppercase">
              Loading orders and invoices...
            </div>
          ) : orders.length === 0 ? (
            <Card variant="default" className="text-center py-12 space-y-3">
              <Receipt className="w-8 h-8 text-course-navyMuted mx-auto" />
              <p className="text-xs text-course-navyMuted">No previous purchase records found.</p>
            </Card>
          ) : (
            <div className="border border-black bg-course-white overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-black bg-course-bg text-course-darkBlue uppercase font-mono">
                  <tr>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-course-orangeSubtle/30">
                      <td className="p-3 font-mono font-bold text-course-darkBlue">
                        {ord.orderNumber || ord.id.substring(0, 13)}
                      </td>
                      <td className="p-3 font-mono text-course-navySubtle">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3 font-bold text-course-darkBlue">{ord.product.title}</td>
                      <td className="p-3 font-mono font-bold text-course-darkBlue">
                        ₹{(ord.amountPaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            ord.status === 'PAID'
                              ? 'success'
                              : ord.status === 'FAILED'
                                ? 'error'
                                : 'default'
                          }
                          size="sm"
                        >
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {ord.invoice ? (
                          <a
                            href={`${siteConfig.urls.api}/api/v1/invoices/${ord.invoice.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline text-[11px] py-1 px-2.5 inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-course-orange" />
                            <span>PDF</span>
                          </a>
                        ) : (
                          <span className="text-course-navySubtle font-mono text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
