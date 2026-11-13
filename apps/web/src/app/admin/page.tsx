'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';
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
  RefreshCw,
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
    <div className="space-y-6 font-reddit">
      {/* Page Title & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 uppercase">
              Store Overview
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time sales, student enrollments, and operational telemetry
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex p-0.5 border border-neutral-200/90 bg-neutral-100">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                period === 'today'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/60'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                period === '7d'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/60'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                period === '30d'
                  ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/60'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchStats(period)}
            title="Refresh metrics"
            className="p-2 border border-neutral-200/90 hover:border-neutral-900 text-neutral-600 hover:text-neutral-950 bg-white hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchStats(period)}
            className="px-2.5 py-1 text-xs font-semibold border border-rose-300 bg-white text-rose-900 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Actionable Warning Cards (Priority Attention) */}
      {data?.alerts && (
        <div>
          {hasIssues ? (
            <div className="p-4 border border-amber-300/90 bg-amber-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Attention Required ({totalIssuesCount} Operational Items)
                </h2>
              </div>
              <p className="text-xs text-amber-900/90">
                Pending checkouts or webhook deliveries require review:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {data.alerts.stuckOrdersCount > 0 && (
                  <div className="p-3.5 bg-white border border-amber-200/90">
                    <div className="text-xs font-bold text-neutral-950">
                      {data.alerts.stuckOrdersCount} Stuck Pending Order(s)
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Checkout initiated over 30 mins ago without Razorpay payment confirmation.
                    </p>
                    <Link
                      href="/admin/orders?status=PENDING"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 hover:underline mt-2.5"
                    >
                      <span>Review Orders</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {data.alerts.unauthorizedPaymentsCount > 0 && (
                  <div className="p-3.5 bg-white border border-amber-200/90">
                    <div className="text-xs font-bold text-neutral-950">
                      {data.alerts.unauthorizedPaymentsCount} Authorized Payment(s)
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Captured at gateway but not reconciled to course access.
                    </p>
                    <Link
                      href="/admin/orders"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 hover:underline mt-2.5"
                    >
                      <span>Check Reconciliation</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {data.alerts.failedWebhooksCount > 0 && (
                  <div className="p-3.5 bg-white border border-amber-200/90">
                    <div className="text-xs font-bold text-neutral-950">
                      {data.alerts.failedWebhooksCount} Failed Webhook Event(s)
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Background sweeper process is automatically scheduling retries.
                    </p>
                    <Link
                      href="/admin/audit-logs"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 hover:underline mt-2.5"
                    >
                      <span>View Audit Log</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 border border-emerald-200/80 bg-emerald-50/50 text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  All systems operating normally. Zero stuck orders, payment discrepancies, or
                  webhook failures.
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 uppercase tracking-wider font-semibold">
                Operational
              </span>
            </div>
          )}
        </div>
      )}

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Total Revenue */}
        <div className="border border-neutral-200/80 bg-white p-5 hover:border-neutral-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Collected Revenue
              </p>
              <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight">
                {isLoading ? '...' : formatRupees(data?.revenueRupees || 0)}
              </div>
              <p className="text-[11px] text-neutral-400">
                Gross sales received in selected window
              </p>
            </div>
            <div className="w-9 h-9 border border-neutral-200 bg-neutral-50 text-neutral-800 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Paid Orders */}
        <div className="border border-neutral-200/80 bg-white p-5 hover:border-neutral-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Completed Orders
              </p>
              <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight">
                {isLoading ? '...' : (data?.ordersCount ?? 0)}
              </div>
              <p className="text-[11px] text-neutral-400">Successfully paid student transactions</p>
            </div>
            <div className="w-9 h-9 border border-neutral-200 bg-neutral-50 text-neutral-800 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* New Students */}
        <div className="border border-neutral-200/80 bg-white p-5 hover:border-neutral-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                New Students
              </p>
              <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight">
                {isLoading ? '...' : (data?.newStudentsCount ?? 0)}
              </div>
              <p className="text-[11px] text-neutral-400">Unique student accounts created</p>
            </div>
            <div className="w-9 h-9 border border-neutral-200 bg-neutral-50 text-neutral-800 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Active Watching Students */}
        <div className="border border-neutral-200/80 bg-white p-5 hover:border-neutral-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Active Viewers
              </p>
              <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight">
                {isLoading ? '...' : (data?.activeStudentsCount ?? 0)}
              </div>
              <p className="text-[11px] text-neutral-400">
                Students watching Bunny CDN video streams
              </p>
            </div>
            <div className="w-9 h-9 border border-neutral-200 bg-neutral-50 text-neutral-800 flex items-center justify-center shrink-0">
              <Video className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Failed Payments */}
        <div className="border border-neutral-200/80 bg-white p-5 hover:border-neutral-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Failed Payments
              </p>
              <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight">
                {isLoading ? '...' : (data?.failedPaymentsCount ?? 0)}
              </div>
              <p className="text-[11px] text-neutral-400">Bank or UPI card declines</p>
            </div>
            <div className="w-9 h-9 border border-rose-200 bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Refunds Processed */}
        <div className="border border-neutral-200/80 bg-white p-5 hover:border-neutral-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Refunds Issued
              </p>
              <div className="text-2xl font-bold font-mono text-neutral-950 tracking-tight">
                {isLoading ? '...' : (data?.refundsCount ?? 0)}
              </div>
              <p className="text-[11px] text-neutral-400">Full or partial refunds processed</p>
            </div>
            <div className="w-9 h-9 border border-neutral-200 bg-neutral-50 text-neutral-800 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* SVG Revenue-By-Day Chart */}
      <div className="border border-neutral-200/80 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-900">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-neutral-950 uppercase tracking-wider">
                Daily Revenue Trend
              </h2>
              <p className="text-xs text-neutral-500">
                Gross sales per calendar day (
                {period === 'today' ? 'Today' : period === '7d' ? 'Last 7 Days' : 'Last 30 Days'})
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-neutral-500">
              Peak Day
            </span>
            <div className="text-sm font-bold font-mono text-neutral-950">
              {formatRupees(maxRevenue)}
            </div>
          </div>
        </div>

        {days.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
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
                {/* Horizontal Gridlines */}
                <line
                  x1="50"
                  y1="20"
                  x2={chartWidth - 20}
                  y2="20"
                  stroke="#F4F4F5"
                  strokeWidth="1"
                />
                <line
                  x1="50"
                  y1="80"
                  x2={chartWidth - 20}
                  y2="80"
                  stroke="#F4F4F5"
                  strokeWidth="1"
                />
                <line
                  x1="50"
                  y1="140"
                  x2={chartWidth - 20}
                  y2="140"
                  stroke="#E4E4E7"
                  strokeWidth="1"
                />

                {/* Y-Axis Label */}
                <text
                  x="45"
                  y="24"
                  textAnchor="end"
                  className="text-[10px] font-mono fill-neutral-400"
                >
                  ₹{Math.round(maxRevenue).toLocaleString()}
                </text>
                <text
                  x="45"
                  y="84"
                  textAnchor="end"
                  className="text-[10px] font-mono fill-neutral-400"
                >
                  ₹{Math.round(maxRevenue / 2).toLocaleString()}
                </text>
                <text
                  x="45"
                  y="144"
                  textAnchor="end"
                  className="text-[10px] font-mono fill-neutral-400"
                >
                  ₹0
                </text>

                {/* Bars per day */}
                {days.map((item, index) => {
                  const availableWidth = chartWidth - 80;
                  const barSpacing = availableWidth / days.length;
                  const barWidth = Math.max(Math.min(barSpacing - 8, 32), 6);
                  const x = 60 + index * barSpacing + (barSpacing - barWidth) / 2;
                  const barHeight = maxRevenue > 0 ? (item.revenueRupees / maxRevenue) * 120 : 0;
                  const y = 140 - barHeight;

                  return (
                    <g key={item.date} className="group cursor-pointer">
                      <title>{`${item.date}: ₹${item.revenueRupees.toLocaleString()} (${item.ordersCount} orders)`}</title>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="#18181B"
                        className="transition-colors group-hover:fill-black"
                      />
                      {/* Date label at bottom */}
                      <text
                        x={x + barWidth / 2}
                        y="158"
                        textAnchor="middle"
                        className="text-[9px] font-mono fill-neutral-500"
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
      </div>

      {/* UTM Marketing / YouTube Funnel Table */}
      <div className="border border-neutral-200/80 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-900">
              <Share2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-neutral-950 uppercase tracking-wider">
                Sales by YouTube Campaign / UTM Attribution
              </h2>
              <p className="text-xs text-neutral-500">
                Identifies which specific videos, descriptions, or external links convert
              </p>
            </div>
          </div>
        </div>

        {!data?.salesByUtm || data.salesByUtm.length === 0 ? (
          <div className="p-6 border border-neutral-200/80 bg-neutral-50 text-center text-xs text-neutral-500">
            No UTM attribution data recorded yet. When you share links on YouTube, append{' '}
            <code className="font-mono bg-white px-1.5 py-0.5 border border-neutral-200 text-neutral-800">
              ?utm_source=youtube&amp;utm_campaign=video_title
            </code>{' '}
            to track video conversion analytics here.
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-200/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/75 border-b border-neutral-200/80">
                  <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                    Source
                  </th>
                  <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">
                    Campaign
                  </th>
                  <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">
                    Orders
                  </th>
                  <th className="p-3 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {data.salesByUtm.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3 font-mono font-medium text-neutral-900">
                      {item.utmSource || '(direct / none)'}
                    </td>
                    <td className="p-3 font-mono text-neutral-600">
                      {item.utmCampaign || '(standard link)'}
                    </td>
                    <td className="p-3 font-mono font-semibold text-right text-neutral-900">
                      {item.ordersCount}
                    </td>
                    <td className="p-3 font-mono font-semibold text-right text-neutral-950">
                      {formatRupees(Math.round(item.revenuePaise / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
