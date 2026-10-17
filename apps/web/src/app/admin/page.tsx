'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  IndianRupee,
  ShoppingBag,
  Users,
  Video,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Share2,
  ArrowRight,
} from 'lucide-react';

interface DashboardStatsResponse {
  period: 'today' | '7d' | '30d';
  revenuePaise: number;
  revenueRupees: number;
  ordersCount: number;
  totalOrdersCount: number;
  newStudentsCount: number;
  activeStudentsCount: number;
  failedPaymentsCount: number;
  refundsCount: number;
  revenueByDay: Array<{
    date: string;
    revenuePaise: number;
    ordersCount: number;
  }>;
  salesByUtm: Array<{
    utmSource: string;
    utmCampaign: string;
    ordersCount: number;
    revenuePaise: number;
  }>;
  alerts: {
    stuckOrdersCount: number;
    unauthorizedPaymentsCount: number;
    failedWebhooksCount: number;
  };
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d');
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async (selectedPeriod: 'today' | '7d' | '30d') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<DashboardStatsResponse>(
        `/admin/dashboard/stats?period=${selectedPeriod}`,
      );
      setData(res);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load dashboard metrics. Please refresh.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  const formatRupees = (rupees: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  // SVG Chart Dimensions & Computations
  const chartHeight = 180;
  const chartWidth = 650;
  const days = (data?.revenueByDay || []).map((d) => ({
    date: d.date,
    revenueRupees: Math.round(d.revenuePaise / 100),
    ordersCount: d.ordersCount,
  }));
  const maxRevenue = Math.max(...days.map((d) => d.revenueRupees), 1000);

  const hasIssues =
    data?.alerts &&
    (data.alerts.stuckOrdersCount > 0 ||
      data.alerts.unauthorizedPaymentsCount > 0 ||
      data.alerts.failedWebhooksCount > 0);

  const totalIssuesCount = data?.alerts
    ? data.alerts.stuckOrdersCount +
      data.alerts.unauthorizedPaymentsCount +
      data.alerts.failedWebhooksCount
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-black">
        <div>
          <h1 className="text-2xl font-black text-course-darkBlue uppercase tracking-tight">
            Store Overview
          </h1>
          <p className="text-xs text-course-navySubtle mt-0.5">
            Real-time sales, student enrollments, and operational alerts
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="inline-flex border border-black bg-course-white self-start">
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider min-h-[36px] transition-colors ${
              period === 'today'
                ? 'bg-course-darkBlue text-white'
                : 'text-course-darkBlue hover:bg-neutral-100'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider min-h-[36px] border-l border-black transition-colors ${
              period === '7d'
                ? 'bg-course-darkBlue text-white'
                : 'text-course-darkBlue hover:bg-neutral-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider min-h-[36px] border-l border-black transition-colors ${
              period === '30d'
                ? 'bg-course-darkBlue text-white'
                : 'text-course-darkBlue hover:bg-neutral-100'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 border border-black bg-rose-50 text-rose-950 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchStats(period)} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Actionable Warning Cards (Priority Attention) */}
      {data?.alerts && (
        <div>
          {hasIssues ? (
            <div className="p-4 border-2 border-amber-600 bg-amber-50 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                <h2 className="text-sm font-black text-amber-950 uppercase tracking-wider">
                  Attention Required ({totalIssuesCount} Issues Found)
                </h2>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Some transactions or automated webhook notifications may require your review:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {data.alerts.stuckOrdersCount > 0 && (
                  <div className="p-3 bg-white border border-black">
                    <div className="text-xs font-bold text-amber-950">
                      {data.alerts.stuckOrdersCount} Stuck Pending Order(s)
                    </div>
                    <p className="text-[11px] text-course-navySubtle mt-0.5">
                      Customer started checkout over 30 minutes ago without payment.
                    </p>
                    <Link
                      href="/admin/orders?status=PENDING"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-course-orange hover:underline mt-2"
                    >
                      <span>Review Orders</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {data.alerts.unauthorizedPaymentsCount > 0 && (
                  <div className="p-3 bg-white border border-black">
                    <div className="text-xs font-bold text-amber-950">
                      {data.alerts.unauthorizedPaymentsCount} Authorized Payment(s)
                    </div>
                    <p className="text-[11px] text-course-navySubtle mt-0.5">
                      Payment approved at Razorpay but not captured into course access.
                    </p>
                    <Link
                      href="/admin/orders"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-course-orange hover:underline mt-2"
                    >
                      <span>Check Reconciliation</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {data.alerts.failedWebhooksCount > 0 && (
                  <div className="p-3 bg-white border border-black">
                    <div className="text-xs font-bold text-amber-950">
                      {data.alerts.failedWebhooksCount} Failed Webhook Event(s)
                    </div>
                    <p className="text-[11px] text-course-navySubtle mt-0.5">
                      System background sweeper is automatically retrying deliveries.
                    </p>
                    <Link
                      href="/admin/audit-logs"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-course-orange hover:underline mt-2"
                    >
                      <span>View Audit Log</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 border border-black bg-emerald-50 text-emerald-950 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-bold">
                All systems operating normally. No stuck orders, uncaptured payments, or webhook issues.
              </span>
            </div>
          )}
        </div>
      )}

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <Card variant="default" padding="md" className="border border-black">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Collected Revenue
              </p>
              <div className="text-2xl font-black text-course-darkBlue mt-1">
                {isLoading ? '...' : formatRupees(data?.revenueRupees || 0)}
              </div>
              <p className="text-[11px] text-course-navySubtle mt-1">
                Converted from paise to rupees
              </p>
            </div>
            <div className="w-10 h-10 bg-course-orangeSubtle text-course-orange border border-black flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Paid Orders */}
        <Card variant="default" padding="md" className="border border-black">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Completed Orders
              </p>
              <div className="text-2xl font-black text-course-darkBlue mt-1">
                {isLoading ? '...' : (data?.ordersCount ?? 0)}
              </div>
              <p className="text-[11px] text-course-navySubtle mt-1">
                Successfully paid purchases
              </p>
            </div>
            <div className="w-10 h-10 bg-neutral-100 text-course-darkBlue border border-black flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* New Students */}
        <Card variant="default" padding="md" className="border border-black">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                New Students
              </p>
              <div className="text-2xl font-black text-course-darkBlue mt-1">
                {isLoading ? '...' : (data?.newStudentsCount ?? 0)}
              </div>
              <p className="text-[11px] text-course-navySubtle mt-1">
                Registered student accounts
              </p>
            </div>
            <div className="w-10 h-10 bg-neutral-100 text-course-darkBlue border border-black flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Active Watching Students */}
        <Card variant="default" padding="md" className="border border-black">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Active Viewers
              </p>
              <div className="text-2xl font-black text-course-darkBlue mt-1">
                {isLoading ? '...' : (data?.activeStudentsCount ?? 0)}
              </div>
              <p className="text-[11px] text-course-navySubtle mt-1">
                Students watching video lessons
              </p>
            </div>
            <div className="w-10 h-10 bg-neutral-100 text-course-darkBlue border border-black flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Failed Payments */}
        <Card variant="default" padding="md" className="border border-black">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Failed Payments
              </p>
              <div className="text-2xl font-black text-course-darkBlue mt-1">
                {isLoading ? '...' : (data?.failedPaymentsCount ?? 0)}
              </div>
              <p className="text-[11px] text-course-navySubtle mt-1">
                Card or UPI declines by bank
              </p>
            </div>
            <div className="w-10 h-10 bg-rose-50 text-rose-700 border border-black flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Refunds Processed */}
        <Card variant="default" padding="md" className="border border-black">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Refunds Issued
              </p>
              <div className="text-2xl font-black text-course-darkBlue mt-1">
                {isLoading ? '...' : (data?.refundsCount ?? 0)}
              </div>
              <p className="text-[11px] text-course-navySubtle mt-1">
                Full or partial refunds returned
              </p>
            </div>
            <div className="w-10 h-10 bg-neutral-100 text-course-darkBlue border border-black flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Flat SVG Revenue-By-Day Chart */}
      <Card variant="default" padding="lg" className="border border-black space-y-4">
        <div className="flex items-center justify-between border-b border-black pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-course-orange" />
            <div>
              <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
                Daily Revenue Trend
              </h2>
              <p className="text-xs text-course-navySubtle">
                Gross sales per calendar day ({period === 'today' ? 'Today' : period === '7d' ? 'Last 7 Days' : 'Last 30 Days'})
              </p>
            </div>
          </div>
        </div>

        {days.length === 0 ? (
          <div className="py-12 text-center text-xs text-course-navySubtle">
            No sales recorded during this selected window.
          </div>
        ) : (
          <div className="overflow-x-auto pt-2">
            <div className="min-w-[500px]">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-48 select-none"
                aria-label="Revenue by Day Bar Chart"
              >
                {/* Gridlines */}
                <line x1="50" y1="20" x2={chartWidth - 20} y2="20" stroke="#E2E8F0" strokeWidth="1" />
                <line x1="50" y1="80" x2={chartWidth - 20} y2="80" stroke="#E2E8F0" strokeWidth="1" />
                <line x1="50" y1="140" x2={chartWidth - 20} y2="140" stroke="#000000" strokeWidth="1.5" />

                {/* Y-Axis Label */}
                <text x="45" y="24" textAnchor="end" className="text-[10px] font-mono fill-slate-500">
                  ₹{Math.round(maxRevenue).toLocaleString()}
                </text>
                <text x="45" y="84" textAnchor="end" className="text-[10px] font-mono fill-slate-500">
                  ₹{Math.round(maxRevenue / 2).toLocaleString()}
                </text>
                <text x="45" y="144" textAnchor="end" className="text-[10px] font-mono fill-slate-500">
                  ₹0
                </text>

                {/* Bars per day */}
                {days.map((item, index) => {
                  const availableWidth = chartWidth - 80;
                  const barSpacing = availableWidth / days.length;
                  const barWidth = Math.max(Math.min(barSpacing - 8, 36), 6);
                  const x = 60 + index * barSpacing + (barSpacing - barWidth) / 2;
                  const barHeight = maxRevenue > 0 ? (item.revenueRupees / maxRevenue) * 120 : 0;
                  const y = 140 - barHeight;

                  return (
                    <g key={item.date} className="group">
                      <title>{`${item.date}: ₹${item.revenueRupees.toLocaleString()} (${item.ordersCount} orders)`}</title>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="#E05305"
                        stroke="#000000"
                        strokeWidth="1"
                        className="transition-colors hover:fill-[#C44500]"
                      />
                      {/* Date label at bottom */}
                      <text
                        x={x + barWidth / 2}
                        y="158"
                        textAnchor="middle"
                        className="text-[9px] font-mono fill-slate-700"
                      >
                        {item.date.slice(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </Card>

      {/* UTM Marketing / YouTube Funnel Table */}
      <Card variant="default" padding="lg" className="border border-black space-y-4">
        <div className="flex items-center justify-between border-b border-black pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-course-orange" />
            <div>
              <h2 className="text-sm font-black text-course-darkBlue uppercase tracking-wider">
                Sales by YouTube Campaign / UTM Source
              </h2>
              <p className="text-xs text-course-navySubtle">
                Tracks which video links and social channels generated course enrollments
              </p>
            </div>
          </div>
        </div>

        {!data?.salesByUtm || data.salesByUtm.length === 0 ? (
          <div className="p-6 border border-black bg-neutral-50 text-center text-xs text-course-navySubtle">
            No UTM attribution data recorded yet. When you share links on YouTube, append <code className="font-mono bg-white px-1 border border-neutral-300">?utm_source=youtube&amp;utm_campaign=video_title</code> to see video conversion numbers here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-neutral-100 border-b border-black">
                  <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                    Source
                  </th>
                  <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider text-right">
                    Orders
                  </th>
                  <th className="p-3 font-black text-course-darkBlue uppercase tracking-wider text-right">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {data.salesByUtm.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="p-3 font-mono font-bold text-course-darkBlue">
                      {item.utmSource || '(direct / none)'}
                    </td>
                    <td className="p-3 font-mono text-course-navyMuted">
                      {item.utmCampaign || '(standard link)'}
                    </td>
                    <td className="p-3 font-mono font-bold text-right text-course-darkBlue">
                      {item.ordersCount}
                    </td>
                    <td className="p-3 font-mono font-black text-right text-course-orange">
                      {formatRupees(Math.round(item.revenuePaise / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
