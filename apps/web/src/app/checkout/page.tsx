'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { siteConfig } from '../../config/site';
import { Button, Input, Card, useToast } from '../../components/ui';
import { ShieldCheck, Tag, AlertTriangle, Lock, MailCheck, RefreshCw, Loader2 } from 'lucide-react';
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
        const res = await fetch(
          `${siteConfig.urls.api}/api/v1/courses/hydraulic-engineering-mastery`,
        );
        const data = await res.json();
        if (data.success && data.data) {
          setCourse({
            id: data.data.id,
            title: data.data.title,
            slug: data.data.slug,
            pricePaise: data.data.pricePaise || 499900,
            validityDays: data.data.validityDays || 365,
          });
        }
      } catch {
        // Fallback default
        setCourse({
          id: '01a13c1f-b373-7703-bd58-313c435411e1',
          title: 'Industrial Hydraulic Systems & Circuit Design',
          slug: 'hydraulic-engineering-mastery',
          pricePaise: 499900,
          validityDays: 365,
        });
      } finally {
        setCourseLoading(false);
      }
    }
    fetchCourse();
  }, []);

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

  // Server Price Quote State (C3: subtotal, discount, tax, total returned directly from server quote)
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

  // Read price and tax breakdown verbatim from the server quote
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
          color: '#E05305',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Verify payment
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
      toastError('Payment Initialization Failed', msg);
      setIsSubmitting(false);
    }
  };

  if (courseLoading || authLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-course-orange" />
        <p className="text-xs uppercase font-mono tracking-widest text-course-darkBlue">
          Securing Checkout Session...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-wider text-course-orange mb-1">
          Secure Course Enrollment
        </div>
        <h1 className="text-3xl font-black text-course-darkBlue tracking-tight">
          Checkout &amp; Invoicing
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Student Details & Email Verification Gate */}
        <div className="lg:col-span-7 space-y-6">
          {/* Email Verification Banner */}
          {isAuthenticated && !user?.emailVerifiedAt && (
            <div className="border-2 border-black p-6 bg-amber-50 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                <span>Action Required: Email Verification</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                Before purchasing, RBI/tax compliance requires a verified email address. We sent a
                verification link to <strong>{user?.email}</strong>.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleResendVerification}
                  isLoading={resendingVerification}
                >
                  <MailCheck className="w-4 h-4 mr-1.5" />
                  Resend Verification Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckVerification}
                  isLoading={checkingVerification}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  I&apos;ve Verified • Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Not logged in banner */}
          {!isAuthenticated && (
            <div className="border-2 border-black p-6 bg-course-orangeSubtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-course-darkBlue">
                  Already have a student account?
                </span>
                <Link href="/login?redirect=/checkout" className="btn-outline text-xs">
                  Sign In
                </Link>
              </div>
              <p className="text-xs text-course-navyMuted">
                Signing in links your course purchase and tax invoices directly to your account.
              </p>
            </div>
          )}

          {/* Student Billing Profile */}
          <Card variant="default">
            <h3 className="font-extrabold text-lg text-course-darkBlue mb-4">
              Billing Information
            </h3>

            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Ramesh Kumar"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                helperText="Will appear on your GST tax invoice"
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="engineer@plant.com"
                required
                disabled={isAuthenticated}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText={
                  isAuthenticated
                    ? 'Linked to your authenticated student account'
                    : 'Account will be created with this email'
                }
              />

              <Input
                label="Phone Number (for SMS & Payment Confirmation)"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                label="Company GSTIN (Optional)"
                placeholder="22AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                helperText="Provide if claiming corporate GST input tax credit"
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary & Coupon */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default" className="border-2">
            <h3 className="font-black text-xl text-course-darkBlue tracking-tight mb-4 border-b border-black pb-3">
              Order Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-course-darkBlue leading-tight">
                    {course?.title}
                  </div>
                  <div className="text-xs text-course-navyMuted mt-0.5">
                    1 Year Unlimited Streaming Access
                  </div>
                </div>
                <div className="font-mono font-bold text-course-darkBlue shrink-0">
                  ₹{(basePricePaise / 100).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Coupon Row */}
              {appliedCoupon && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-800 bg-emerald-50 p-2 border border-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon ({appliedCoupon.code})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>-₹{(discountPaise / 100).toLocaleString('en-IN')}</span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-rose-700 underline text-[10px] ml-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Coupon Form */}
              {!appliedCoupon && (
                <form onSubmit={handleApplyCoupon} className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="input-base text-xs font-mono uppercase py-2 flex-1 min-h-[44px]"
                    />
                    <Button type="submit" variant="outline" size="sm" isLoading={couponLoading}>
                      Apply
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] font-bold text-rose-700 mt-1">{couponError}</p>
                  )}
                </form>
              )}

              {/* GST Tax Breakdown: Shown ONLY when server quote reports applicable tax and taxPaise > 0 */}
              {isTaxApplicable && taxPaise > 0 && (
                <div className="border-t border-black/20 pt-3 space-y-1.5 text-xs text-course-navyMuted">
                  <div className="flex justify-between">
                    <span>Net Taxable Value</span>
                    <span className="font-mono">
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
                    <span className="font-mono">
                      ₹
                      {(taxPaise / 100).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Total Row */}
              <div className="border-t-2 border-black pt-3 flex justify-between items-center text-base font-black text-course-darkBlue">
                <span>Total Amount Due</span>
                <span className="text-2xl font-black font-mono">
                  ₹{(finalPricePaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <div className="mt-6 pt-4 border-t border-black">
              {!isAuthenticated ? (
                <Link
                  href="/login?redirect=/checkout"
                  className="btn-primary block text-center uppercase tracking-wide text-xs py-3.5 font-bold"
                >
                  Sign In to Continue Checkout
                </Link>
              ) : !user?.emailVerifiedAt ? (
                <Button
                  variant="primary"
                  disabled
                  className="w-full text-xs uppercase tracking-wide py-3.5 opacity-50 cursor-not-allowed"
                >
                  Verify Email to Enable Payment
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full text-xs uppercase tracking-wide py-4 font-black"
                  onClick={handleProceedToPayment}
                  disabled={quoteLoading}
                  isLoading={isSubmitting || quoteLoading}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Pay ₹{(finalPricePaise / 100).toLocaleString('en-IN')} With Razorpay
                </Button>
              )}

              <div className="flex items-center justify-center gap-2 text-[11px] text-course-navySubtle mt-4">
                <ShieldCheck className="w-4 h-4 text-course-orange" />
                <span>256-bit Encrypted • Direct GST Invoicing • Test Gateway</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
