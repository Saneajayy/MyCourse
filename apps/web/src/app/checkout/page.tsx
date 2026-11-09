'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import {
  ShieldCheck,
  Tag,
  AlertTriangle,
  AlertCircle,
  Lock,
  MailCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { computeOrderTotals, TaxConfig } from '../../lib/tax';

interface CourseProduct {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  validityDays: number;
}

interface CouponData {
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  productId?: string | null;
  isActive: boolean;
}

export interface ServerPriceQuote {
  productId: string;
  courseTitle: string;
  courseSlug: string;
  basePricePaise: number;
  discountPaise: number;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: string;
  isTaxApplicable: boolean;
  taxRatePercent: number;
  pricesTaxInclusive: boolean;
  coupon: {
    code: string;
    discountPaise: number;
    type: string;
    value: number;
  } | null;
}

declare global {
  interface Window {
    Razorpay?: unknown;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseSlugParam = searchParams.get('course') || 'hydraulic-engineering-mastery';

  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const [course, setCourse] = useState<CourseProduct | null>(null);
  const [courseLoading, setCourseLoading] = useState(true);

  // Billing Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Checkout Execution State
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Load Razorpay Checkout Script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Capture UTM parameters from URL and store in sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');

    if (utmSource) sessionStorage.setItem('utm_source', utmSource);
    if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium);
    if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign);
  }, [searchParams]);

  // Tax Configuration State (Loaded from server AppSetting)
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);

  // Fetch Public Tax Configuration
  useEffect(() => {
    async function fetchTaxConfig() {
      try {
        const res = await fetch(`${siteConfig.urls.api}/api/v1/orders/tax-config`);
        const data = await res.json();
        if (data.success && data.data) {
          setTaxConfig(data.data);
        }
      } catch {
        // Fallback default: zero tax if unreachable
        setTaxConfig({ gstin: '', gstRatePercent: 0, pricesTaxInclusive: true });
      }
    }
    fetchTaxConfig();
  }, []);

  // Fetch Course details
  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await fetch(`${siteConfig.urls.api}/api/v1/courses/${courseSlugParam}`);
        const data = await res.json();
        if (data.success && data.data) {
          setCourse({
            id: data.data.id,
            title: data.data.title,
            slug: data.data.slug,
            pricePaise: data.data.pricePaise || 499900,
            validityDays: data.data.validityDays || 365,
          });
        } else {
          throw new Error('Course not found');
        }
      } catch {
        // Fallback default
        setCourse({
          id: '01a13c1f-b373-7703-bd58-313c435411e1',
          title: 'Hydraulic System Basics',
          slug: 'hydraulic-engineering-mastery',
          pricePaise: 499900,
          validityDays: 365,
        });
      } finally {
        setCourseLoading(false);
      }
    }
    fetchCourse();
  }, [courseSlugParam]);

  // Sync user details to form
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      if (user.phone) {
        setPhone(user.phone);
      }
    }
  }, [user]);

  // Apply Coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const code = couponInput.trim().toUpperCase();
      const res = await apiClient<CouponData>(`/coupons/${encodeURIComponent(code)}`);
      if (res && res.isActive) {
        setAppliedCoupon(res);
        toastSuccess('Coupon Applied', `Code ${code} activated successfully.`);
      } else {
        setCouponError('This coupon is no longer active.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid coupon code';
      setCouponError(msg);
      toastError('Coupon Error', msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  // Server Price Quote State
  const [quote, setQuote] = useState<ServerPriceQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Fetch Server Quote whenever course or applied coupon changes
  useEffect(() => {
    if (!course) return;

    let isMounted = true;
    setQuoteLoading(true);

    async function fetchQuote() {
      try {
        const res = await fetch(`${siteConfig.urls.api}/api/v1/orders/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseSlug: course?.slug,
            couponCode: appliedCoupon?.code,
          }),
        });
        const data = await res.json();
        if (data.success && data.data && isMounted) {
          setQuote(data.data);
        }
      } catch {
        // Fallback to local computation if server quote endpoint unreachable
        if (isMounted) {
          const base = course?.pricePaise || 499900;
          let disc = 0;
          if (appliedCoupon) {
            disc =
              appliedCoupon.type === 'PERCENT'
                ? Math.round((base * appliedCoupon.value) / 100)
                : appliedCoupon.value * 100;
          }
          const t = computeOrderTotals(base, disc, taxConfig);
          setQuote({
            productId: course?.id || '',
            courseTitle: course?.title || '',
            courseSlug: course?.slug || '',
            basePricePaise: base,
            discountPaise: disc,
            subtotalPaise: t.subtotalPaise,
            taxPaise: t.taxPaise,
            totalPaise: t.totalPaise,
            currency: 'INR',
            isTaxApplicable: t.isTaxApplicable,
            taxRatePercent: t.gstRatePercent,
            pricesTaxInclusive: taxConfig?.pricesTaxInclusive !== false,
            coupon: appliedCoupon
              ? {
                  code: appliedCoupon.code,
                  discountPaise: disc,
                  type: appliedCoupon.type,
                  value: appliedCoupon.value,
                }
              : null,
          });
        }
      } finally {
        if (isMounted) {
          setQuoteLoading(false);
        }
      }
    }

    fetchQuote();

    return () => {
      isMounted = false;
    };
  }, [course, appliedCoupon, taxConfig]);

  // Read price and tax breakdown
  const basePricePaise = quote?.basePricePaise ?? course?.pricePaise ?? 499900;
  const discountPaise = quote?.discountPaise ?? 0;
  const subtotalPaise = quote?.subtotalPaise ?? basePricePaise;
  const taxPaise = quote?.taxPaise ?? 0;
  const finalPricePaise = quote?.totalPaise ?? basePricePaise;
  const isTaxApplicable = quote?.isTaxApplicable ?? false;
  const taxRatePercent = quote?.taxRatePercent ?? 0;
  const pricesTaxInclusive = quote?.pricesTaxInclusive ?? taxConfig?.pricesTaxInclusive !== false;

  // Resend verification email
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

  // Check verification status
  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    try {
      const updatedUser = await refreshUser();
      if (updatedUser?.emailVerifiedAt) {
        toastSuccess('Email Confirmed', 'You are now verified and can proceed to pay.');
      } else {
        toastInfo('Pending', 'Email is not verified yet. Please click the link in your email.');
      }
    } catch {
      toastError('Error', 'Failed to refresh verification status.');
    } finally {
      setCheckingVerification(false);
    }
  };

  // Proceed to Checkout
  const handleProceedToPayment = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!user?.emailVerifiedAt) {
      toastError('Verification Required', 'Please verify your email address to continue.');
      return;
    }

    if (!course) {
      toastError('Error', 'Course details not loaded');
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);

    try {
      // 1. Generate or retrieve Idempotency-Key
      let idempotencyKey = sessionStorage.getItem('checkout_idempotency_key');
      if (!idempotencyKey) {
        idempotencyKey = `ord_idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('checkout_idempotency_key', idempotencyKey);
      }

      // 2. Read UTM parameters
      const utmSource = sessionStorage.getItem('utm_source') || undefined;
      const utmMedium = sessionStorage.getItem('utm_medium') || undefined;
      const utmCampaign = sessionStorage.getItem('utm_campaign') || undefined;

      // 3. Create Order on Backend
      const orderRes = await apiClient<{
        order: {
          id: string;
          totalPaise: number;
          amountPaise?: number;
          status: string;
          razorpayOrderId?: string;
          gatewayOrderId?: string;
          product: { title: string };
        };
        razorpayOrderId?: string;
        razorpayKeyId?: string;
        gatewayKeyId?: string;
      }>('/orders', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          productId: course.id,
          couponCode: appliedCoupon?.code?.trim() || undefined,
          billingDetails: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() ? phone.trim() : undefined,
            gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
            country: 'IN',
          },
          utmSource,
          utmMedium,
          utmCampaign,
        }),
      });

      const orderData = orderRes.order;

      // Case A: 100% Free / COUPON_100 already PAID
      if (orderData.status === 'PAID') {
        sessionStorage.removeItem('checkout_idempotency_key');
        toastSuccess('Order Complete', 'Access granted to course.');
        router.push(`/order/success/${orderData.id}`);
        return;
      }

      // Case B: Razorpay Checkout Modal
      const RazorpayConstructor = (
        window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }
      ).Razorpay;
      if (!RazorpayConstructor) {
        throw new Error('Payment gateway SDK failed to load. Please check your connection.');
      }

      const totalAmountPaise = orderData.totalPaise ?? orderData.amountPaise ?? finalPricePaise;
      const gatewayOrderId =
        orderRes.razorpayOrderId || orderData.razorpayOrderId || orderData.gatewayOrderId;
      const gatewayKeyId =
        orderRes.razorpayKeyId || orderRes.gatewayKeyId || siteConfig.razorpayKeyId;

      if (!gatewayOrderId) {
        throw new Error('Failed to obtain gateway order identifier. Please retry.');
      }

      const options = {
        key: gatewayKeyId,
        amount: totalAmountPaise,
        currency: 'INR',
        name: siteConfig.brandName,
        description: orderData.product?.title || course.title,
        order_id: gatewayOrderId,
        prefill: {
          name: name.trim(),
          email: email.trim(),
          contact: phone.trim() || undefined,
        },
        theme: {
          color: '#0033FF',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiClient('/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            sessionStorage.removeItem('checkout_idempotency_key');
            router.push(`/order/pending/${orderData.id}`);
          } catch {
            router.push(`/order/pending/${orderData.id}`);
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
          },
        },
      };

      const rzpInstance = new RazorpayConstructor(options);
      rzpInstance.open();
    } catch (err: unknown) {
      sessionStorage.removeItem('checkout_idempotency_key');
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      setCheckoutError(msg);
      toastError('Payment Initialization Failed', msg);
      setIsSubmitting(false);
    }
  };

  if (courseLoading || authLoading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-28 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <p className="text-sm font-semibold tracking-wider uppercase text-white/80">
          Securing Checkout Session...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto py-10 sm:py-14 md:py-16 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
      {/* Page Title: Exact same scale, font weight & line height as the landing page titles */}
      <div className="mb-10 sm:mb-14 select-none">
        <h1 className="font-extrabold text-white leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] select-none uppercase">
          <span className="block">CHECKOUT &amp;</span>
          <span className="block">INVOICING.</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-start">
        {/* Left Column: Student Details & Email Verification Gate */}
        <div className="lg:col-span-7 space-y-6">
          {/* Email Verification Banner */}
          {isAuthenticated && !user?.emailVerifiedAt && (
            <div className="w-full bg-[#FEF3C7] border border-amber-300/80 rounded-lg sm:rounded-xl p-6 sm:p-7 shadow-lg text-amber-950">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Action Required: Email Verification</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                  Before purchasing, RBI/tax compliance requires a verified email address. We sent a
                  verification code to <strong className="font-semibold text-black">{user?.email}</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(user?.email || '')}`}
                    className="h-10 px-4 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs rounded-md sm:rounded-lg shadow-sm transition-all flex items-center justify-center cursor-pointer"
                  >
                    Enter 6-Digit OTP
                  </Link>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="h-10 px-4 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-bold text-xs rounded-md sm:rounded-lg shadow-sm transition-all flex items-center cursor-pointer disabled:opacity-60"
                  >
                    {resendingVerification ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <MailCheck className="w-4 h-4 mr-1.5" />
                    )}
                    Resend Verification Email
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={checkingVerification}
                    className="h-10 px-4 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-bold text-xs rounded-md sm:rounded-lg shadow-sm transition-all flex items-center cursor-pointer disabled:opacity-60"
                  >
                    {checkingVerification ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                    )}
                    I&apos;ve Verified • Refresh
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Not logged in prompt banner */}
          {!isAuthenticated && (
            <div className="w-full bg-white rounded-lg sm:rounded-xl p-5 sm:p-6 shadow-lg text-neutral-900 border border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-sm sm:text-base text-neutral-900 block">
                  Already have a student account?
                </span>
                <p className="text-xs text-neutral-600">
                  Signing in links your course purchase and tax invoices directly to your account.
                </p>
              </div>
              <Link
                href="/login?redirect=/checkout"
                className="h-10 px-5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs rounded-md sm:rounded-lg shadow-sm transition-all flex items-center justify-center shrink-0"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Student Billing Profile: Plain White Card with Rounded Corners like Landing Page */}
          <div className="w-full bg-white rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl p-6 sm:p-8 md:p-9 text-neutral-900 border border-neutral-100 select-none">
            {/* Card Content */}
            <div className="w-full space-y-5">
              <div className="border-b border-neutral-200 pb-3">
                <h2 className="font-bold text-lg sm:text-xl text-neutral-900 tracking-tight">
                  Billing Information
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Enter student contact and official invoice billing parameters.
                </p>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="checkout-name" className="text-sm font-bold text-neutral-900">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    placeholder="Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-[44px] sm:h-[46px] rounded-md sm:rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all"
                  />
                  <p className="text-[11px] sm:text-xs text-neutral-500">
                    Will appear on your GST tax invoice
                  </p>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="checkout-email" className="text-sm font-bold text-neutral-900">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    disabled={isAuthenticated}
                    placeholder="engineer@plant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-[44px] sm:h-[46px] rounded-md sm:rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all disabled:bg-neutral-100 disabled:text-neutral-600 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] sm:text-xs text-neutral-500">
                    {isAuthenticated
                      ? 'Linked to your authenticated student account'
                      : 'Account will be created with this email'}
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="checkout-phone" className="text-sm font-bold text-neutral-900">
                    Phone Number (for SMS &amp; Payment Confirmation)
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-[44px] sm:h-[46px] rounded-md sm:rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Company GSTIN */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="checkout-gstin" className="text-sm font-bold text-neutral-900">
                    Company GSTIN (Optional)
                  </label>
                  <input
                    id="checkout-gstin"
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full h-[44px] sm:h-[46px] rounded-md sm:rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all font-mono uppercase"
                  />
                  <p className="text-[11px] sm:text-xs text-neutral-500">
                    Provide if claiming corporate GST input tax credit
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Coupon Card - Plain White Card with Rounded Corners like Landing Page */}
        <div className="lg:col-span-5 space-y-6">
          <div className="w-full bg-white rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl p-6 sm:p-8 md:p-9 text-neutral-900 border border-neutral-100 select-none">
            {/* Card Content */}
            <div className="w-full space-y-5">
              <div className="border-b border-neutral-200 pb-3 mb-5">
                <h3 className="font-bold text-lg sm:text-xl text-neutral-900 tracking-tight">
                  Order Summary
                </h3>
              </div>

              <div className="space-y-4 text-sm">
                {/* Course Item Row */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-neutral-900 leading-snug">
                      {course?.title}
                    </div>
                    <div className="text-xs text-neutral-500">
                      1 Year Unlimited Streaming Access
                    </div>
                  </div>
                  <div className="font-mono font-bold text-neutral-900 shrink-0 text-base">
                    ₹{(basePricePaise / 100).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Applied Coupon Banner */}
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-900 bg-emerald-50 p-2.5 rounded-md border border-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-emerald-700" />
                      <span>Coupon ({appliedCoupon.code})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">
                        -₹{(discountPaise / 100).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-rose-700 hover:text-rose-900 underline text-xs font-semibold ml-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Coupon Code Input Form */}
                {!appliedCoupon && (
                  <form onSubmit={handleApplyCoupon} className="pt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Coupon Code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="w-full h-[42px] sm:h-[44px] rounded-md sm:rounded-lg border border-neutral-300 bg-white px-3.5 text-xs font-mono uppercase text-neutral-900 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all flex-1"
                      />
                      <button
                        type="submit"
                        disabled={couponLoading}
                        className="h-[42px] sm:h-[44px] px-5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-md sm:rounded-lg transition-all shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        {couponLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] font-bold text-rose-700 mt-1.5">{couponError}</p>
                    )}
                  </form>
                )}

                {/* GST Tax Breakdown */}
                {isTaxApplicable && taxPaise > 0 && (
                  <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-xs text-neutral-600">
                    <div className="flex justify-between">
                      <span>Net Taxable Value</span>
                      <span className="font-mono text-neutral-800">
                        ₹
                        {(subtotalPaise / 100).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        IGST / CGST+SGST ({taxRatePercent}%{' '}
                        {pricesTaxInclusive ? 'Inclusive' : 'Exclusive'})
                      </span>
                      <span className="font-mono text-neutral-800">
                        ₹
                        {(taxPaise / 100).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total Row */}
                <div className="border-y border-neutral-200 py-4 sm:py-5 flex justify-between items-center text-neutral-900">
                  <span className="text-sm sm:text-base font-bold">Total Amount Due</span>
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#0033FF] leading-none">
                    ₹{(finalPricePaise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Payment Action Button */}
              <div className="pt-2">
                {checkoutError && (
                  <div className="mb-3.5 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                )}
                {!isAuthenticated ? (
                  <Link
                    href="/login?redirect=/checkout"
                    className="w-full h-[48px] sm:h-[50px] bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-sm sm:text-base uppercase tracking-wider rounded-md sm:rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer text-center"
                  >
                    Sign In to Continue Checkout
                  </Link>
                ) : !user?.emailVerifiedAt ? (
                  <button
                    type="button"
                    disabled
                    className="w-full h-[48px] sm:h-[50px] bg-neutral-300 text-neutral-600 font-bold text-xs sm:text-sm uppercase tracking-wider rounded-md sm:rounded-lg opacity-60 cursor-not-allowed flex items-center justify-center text-center"
                  >
                    Verify Email to Enable Payment
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    disabled={quoteLoading || isSubmitting}
                    className="w-full h-[48px] sm:h-[50px] bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-sm sm:text-base rounded-md sm:rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-[#0033FF]/25"
                  >
                    {isSubmitting || quoteLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <Lock className="w-4.5 h-4.5 text-white" />
                    )}
                    <span>
                      Pay ₹{(finalPricePaise / 100).toLocaleString('en-IN')} With Razorpay
                    </span>
                  </button>
                )}

                {/* Trust & Compliance Badge */}
                <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-neutral-500 mt-4 text-center">
                  <ShieldCheck className="w-4 h-4 text-[#0033FF] shrink-0" />
                  <span>256-bit Encrypted • Direct GST Invoicing • Test Gateway</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Checkout Navigation"
        className="w-full h-20 md:h-[84px] flex items-stretch justify-between"
      >
        {/* Left Side: Brand Logo + Back to Course Link */}
        <div className="flex items-center pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 gap-6 sm:gap-8 lg:gap-10">
          <Link
            href="/"
            className="flex flex-col justify-center -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>

          {/* Clean Escape Link: Back to Course */}
          <Link
            href="/"
            className="text-white/80 hover:text-white font-semibold text-sm sm:text-base tracking-normal transition-colors py-2 flex items-center gap-2"
          >
            <span aria-hidden="true">&larr;</span> Back to Course
          </Link>
        </div>

        {/* Right Side: Account / Login Cell with Full-Height Vertical Divider */}
        <div className="flex items-stretch">
          <div className="figma-glass-divider border-r border-white/20 h-full flex items-stretch">
            {isAuthenticated ? (
              <Link
                href="/my-courses"
                className="h-full flex items-center justify-center px-6 sm:px-8 lg:px-10 text-white font-semibold text-[15px] sm:text-[16px] xl:text-[17px] tracking-normal hover:bg-white/10 active:bg-white/15 transition-all whitespace-nowrap"
              >
                My Courses
              </Link>
            ) : (
              <Link
                href="/login?redirect=/checkout"
                className="h-full flex items-center justify-center px-6 sm:px-8 lg:px-10 text-white font-semibold text-[15px] sm:text-[16px] xl:text-[17px] tracking-normal hover:bg-white/10 active:bg-white/15 transition-all whitespace-nowrap"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default function CheckoutPage() {
  return (
    <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture Overlay matching landing page */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Conversion-Focused Checkout Glass Navbar */}
      <CheckoutNavbar />

      {/* Main Checkout Section */}
      <main className="relative z-10 flex-1 pb-16 sm:pb-24">
        <Suspense
          fallback={
            <div className="w-full flex-1 flex flex-col items-center justify-center py-28 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-white" />
              <p className="text-sm font-semibold tracking-wider uppercase text-white/80">
                Loading Checkout...
              </p>
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </main>
    </div>
  );
}
