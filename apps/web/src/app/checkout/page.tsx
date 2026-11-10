'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import {
  ShieldCheck,
  Tag,
  AlertTriangle,
  Lock,
  MailCheck,
  RefreshCw,
  Loader2,
  Check,
  X,
  ArrowLeft,
  Star,
  Sparkles,
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

function UpiLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="UPI">
      <path d="M12.8 1L4 11.5H9.2L6.5 21L17 11.5H11.5L12.8 1Z" fill="#097939" />
      <path d="M17.5 5.5L23.5 11.5L17.5 17.5" stroke="#F47920" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="27" y="15" fill="#1F2937" fontSize="12" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.04em">
        UPI
      </text>
    </svg>
  );
}

function VisaLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 50 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
      <path
        d="M19.4 16.5L21.8 1.5H25.6L23.2 16.5H19.4ZM35.8 1.8C35 1.5 33.7 1.2 32.1 1.2C28.4 1.2 25.8 3.2 25.8 6C25.8 8.1 27.6 9.3 28.9 10C30.2 10.7 30.7 11.1 30.7 11.8C30.7 12.9 29.5 13.4 28.3 13.4C26.8 13.4 25.9 13.1 24.6 12.4L24.1 12.1L23.4 15.3C24.4 15.8 26.2 16.2 28.1 16.2C32.1 16.2 34.7 14.2 34.7 11.4C34.7 9 32.7 7.7 31.1 6.9C29.9 6.3 29.4 5.9 29.4 5.2C29.4 4.5 30.1 3.9 31.5 3.9C32.7 3.9 33.7 4.2 34.6 4.6L35 4.8L35.8 1.8ZM43 1.5H40C39.1 1.5 38.3 1.8 38 2.6L32.4 16.5H36.4L37.2 14.1H42.1L42.6 16.5H46.3L43 1.5ZM38.3 11.1L40.3 5.3L41.5 11.1H38.3ZM16.2 1.5L12.5 11.8L12.1 9.9C11.4 7.5 10 5 8 3.7L11.5 16.5H15.5L20.2 1.5H16.2Z"
        fill="#1A1F71"
      />
      <path d="M9.6 1.5H3.6L3.5 1.8C8.2 3 11.8 6.1 13.1 9.5L11.9 3.1C11.7 2 10.7 1.5 9.6 1.5Z" fill="#F7B600" />
    </svg>
  );
}

function MastercardLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
      <circle cx="12" cy="12" r="10" fill="#EB001B" />
      <circle cx="26" cy="12" r="10" fill="#F79E1B" />
      <path
        d="M19 5.35C20.9 6.9 22.1 9.3 22.1 12C22.1 14.7 20.9 17.1 19 18.65C17.1 17.1 15.9 14.7 15.9 12C15.9 9.3 17.1 6.9 19 5.35Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function RuPayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 54 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="RuPay">
      <text x="2" y="15" fill="#0C2340" fontSize="13" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" fontStyle="italic" letterSpacing="-0.02em">
        RuPay
      </text>
      <path d="M38 3L41.5 10L38 17H34.5L38 10L34.5 3H38Z" fill="#008037" />
      <path d="M42 3L45.5 10L42 17H38.5L42 10L38.5 3H42Z" fill="#F47920" />
    </svg>
  );
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
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#0033FF]" />
        <p className="text-sm font-semibold tracking-wider uppercase text-neutral-600">
          Securing Checkout Session...
        </p>
      </div>
    );
  }



  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row">
      {/* ============================================================== */}
      {/* LEFT COLUMN: Product Summary, Course Card, Perks, Order Details */}
      {/* (Brand Deep Blue #00186B, High-Contrast White & Cyan Typography)  */}
      {/* ============================================================== */}
      <div className="w-full lg:w-1/2 lg:min-h-screen bg-[#00186B] text-white flex flex-col justify-between relative overflow-y-auto p-6 sm:p-9 md:p-12 xl:p-16 border-b lg:border-b-0 lg:border-r border-white/10 select-none">
        {/* Subtle decorative mesh gradient in the background */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 bg-[#0033FF]/30 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 bg-[#001147]/80 rounded-full blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-8 max-w-xl mx-auto lg:mx-0 w-full">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-white/15">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white text-xs sm:text-sm font-semibold transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5] transition-transform group-hover:-translate-x-1" />
              <span>Back to Course</span>
            </Link>

            <Link
              href="/"
              className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity text-right select-none"
              aria-label="HYDRO BASICS Home"
            >
              <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
                HYDRO
              </span>
              <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
                BASICS
              </span>
            </Link>
          </div>

          {/* Section Eyebrow */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-xs font-bold tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Industrial Masterclass Enrollment</span>
            </div>
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
              Order Summary.
            </h1>
            <p className="text-sm text-blue-100/75 mt-2 leading-relaxed">
              Review your course enrollment, syllabus validity, and tax-inclusive breakdown below.
            </p>
          </div>

          {/* Course Card Preview */}
          <div className="w-full bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl transition-all">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Course Thumbnail */}
              <div className="relative w-full sm:w-36 md:w-40 aspect-video sm:aspect-square rounded-xl overflow-hidden shrink-0 border border-white/20 bg-black/40">
                <Image
                  src="/course-hydraulic-basics.jpg"
                  alt={course?.title || 'Hydraulic System Basics'}
                  fill
                  sizes="(max-width: 640px) 100vw, 160px"
                  className="object-cover object-center"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold tracking-wide uppercase text-white backdrop-blur-sm">
                  1 Year Access
                </span>
              </div>

              {/* Course Information */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">
                  Self-Paced Masterclass
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug truncate">
                  {course?.title || 'Hydraulic System Basics'}
                </h2>
                <p className="text-xs text-blue-100/80 line-clamp-2 leading-relaxed">
                  Comprehensive industrial hydraulic engineering: valve schematics, pump selection, fluid power, and field troubleshooting.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/90">
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                    <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                    Hindi + Eng Terms
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                    <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                    QR Verified Certificate
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details & Pricing Card */}
          <div className="w-full bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">
                Order Breakdown
              </h3>
              <span className="text-xs font-mono font-medium text-blue-200">
                INR (₹) Invoicing
              </span>
            </div>

            {/* Base Course Price */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-100">Course Base Enrollment</span>
              <span className="font-mono font-bold text-white">
                ₹{(basePricePaise / 100).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Applied Coupon Display */}
            {appliedCoupon && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-300 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/30">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>Coupon ({appliedCoupon.code})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    -₹{(discountPaise / 100).toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-rose-300 hover:text-white underline text-xs font-semibold ml-1 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Coupon Code Input */}
            {!appliedCoupon && (
              <form onSubmit={handleApplyCoupon} className="pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="w-full h-10 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-mono uppercase text-white placeholder:text-white/40 focus:border-cyan-300 focus:bg-white/15 focus:outline-none transition-all flex-1"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading}
                    className="h-10 px-4 bg-white hover:bg-neutral-100 text-[#00186B] font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-60 shrink-0"
                  >
                    {couponLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#00186B]" />
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] font-semibold text-rose-300 mt-1.5 flex items-center gap-1">
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{couponError}</span>
                  </p>
                )}
              </form>
            )}

            {/* GST Tax Breakdown */}
            {isTaxApplicable && taxPaise > 0 && (
              <div className="border-t border-white/15 pt-3 space-y-1.5 text-xs text-blue-100/80">
                <div className="flex justify-between">
                  <span>Net Taxable Value</span>
                  <span className="font-mono text-white">
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
                  <span className="font-mono text-white">
                    ₹
                    {(taxPaise / 100).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Total Amount Due */}
            <div className="border-t border-white/20 pt-4 flex justify-between items-end">
              <div>
                <span className="text-xs uppercase tracking-wider text-cyan-200 block font-bold">
                  Total Amount Due
                </span>
                <span className="text-[11px] text-blue-200/70">
                  {pricesTaxInclusive ? 'All GST & taxes included' : '+ Applicable taxes calculated'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none block">
                  ₹{(finalPricePaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Social Proof & Rating Trust */}
          <div className="flex items-center justify-between text-xs text-blue-100/75 pt-2 border-t border-white/15">
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <span className="font-semibold text-white">4.9 / 5</span>
              <span>(1,200+ engineers)</span>
            </div>
            <span className="hidden sm:inline-block font-mono text-[11px] text-cyan-300">
              ISO-Compliant Curriculum
            </span>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="relative z-10 pt-8 mt-8 border-t border-white/15 text-center lg:text-left text-xs text-blue-100/60">
          <p>
            Official course curriculum by <strong className="text-white">{siteConfig.instructor.name}</strong>. Certified for plant engineers, diploma holders, and maintenance technicians.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Clean White Background, Billing Info & Checkout  */}
      {/* ============================================================== */}
      <div className="w-full lg:w-1/2 lg:min-h-screen bg-white text-neutral-900 flex flex-col justify-between relative overflow-y-auto p-6 sm:p-9 md:p-12 xl:p-16">
        {/* Top Header Bar: Top-Left Account Status & Top-Right Brand Logo */}
        <div className="w-full max-w-lg mx-auto flex items-center justify-between pb-5 border-b border-neutral-200 mb-6 sm:mb-8">
          {/* Top-Left: Already Signed In / Enrolled Status */}
          <div>
            {isAuthenticated ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs text-neutral-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-[200px] font-medium" title={user?.email}>
                  {user?.email}
                </span>
              </div>
            ) : (
              <div className="text-xs text-neutral-600">
                Already enrolled?{' '}
                <Link
                  href="/login?redirect=/checkout"
                  className="font-bold text-[#0033FF] hover:underline hover:text-[#0028D6] ml-0.5"
                >
                  Sign In &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Top-Right: Brand Logo */}
          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-[#0033FF] hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
            aria-label="HYDRO BASICS Home - Back to Course"
          >
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </div>

        {/* Centered Billing & Checkout Container */}
        <div className="w-full max-w-lg mx-auto my-auto space-y-6">
          {/* Email Verification Warning Alert Gate */}
          {isAuthenticated && !user?.emailVerifiedAt && (
            <div className="w-full bg-[#FEF3C7] border border-amber-300 rounded-xl p-5 shadow-sm text-amber-950">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Action Required: Email Verification</span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Before purchasing, RBI/tax compliance requires a verified email address. We sent a
                  verification code to <strong className="font-semibold text-black">{user?.email}</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(user?.email || '')}`}
                    className="h-9 px-3.5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center cursor-pointer"
                  >
                    Enter 6-Digit OTP
                  </Link>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="h-9 px-3 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center cursor-pointer disabled:opacity-60"
                  >
                    {resendingVerification ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <MailCheck className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Resend Email
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={checkingVerification}
                    className="h-9 px-3 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center cursor-pointer disabled:opacity-60"
                  >
                    {checkingVerification ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    I&apos;ve Verified • Refresh
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Simple Billing Information Headline */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Billing Information
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
              Enter your student contact and tax invoice information. Your course access will be unlocked instantly.
            </p>
          </div>

          {/* Billing Form Fields */}
          <div className="space-y-4 pt-1">
            {/* Full Name */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="checkout-name" className="text-sm font-bold text-neutral-900 flex items-center justify-between">
                <span>Full Name <span className="text-rose-500">*</span></span>
                <span className="text-[11px] font-normal text-neutral-500">For Certificate &amp; Invoice</span>
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                placeholder="Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="checkout-email" className="text-sm font-bold text-neutral-900 flex items-center justify-between">
                <span>Email Address <span className="text-rose-500">*</span></span>
                <span className="text-[11px] font-normal text-neutral-500">
                  {isAuthenticated ? 'Linked account' : 'Login will be sent here'}
                </span>
              </label>
              <input
                id="checkout-email"
                type="email"
                required
                disabled={isAuthenticated}
                placeholder="engineer@plant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all disabled:bg-neutral-100 disabled:text-neutral-600 disabled:cursor-not-allowed"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="checkout-phone" className="text-sm font-bold text-neutral-900 flex items-center justify-between">
                <span>Phone Number</span>
                <span className="text-[11px] font-normal text-neutral-500">SMS &amp; WhatsApp Receipt</span>
              </label>
              <input
                id="checkout-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all font-mono"
              />
            </div>

            {/* Company GSTIN */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="checkout-gstin" className="text-sm font-bold text-neutral-900 flex items-center justify-between">
                <span>Company GSTIN (Optional)</span>
                <span className="text-[11px] font-normal text-neutral-500">For Business Input Credit</span>
              </label>
              <input
                id="checkout-gstin"
                type="text"
                placeholder="22AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all font-mono uppercase"
              />
            </div>
          </div>

          {/* Error Alert Banner: Translucent Red (matching Login/Register) */}
          {checkoutError && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-700 text-xs sm:text-[13px] font-medium flex items-center justify-center text-center animate-in fade-in">
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Primary Checkout CTA */}
          <div className="pt-2 space-y-3">
            {!isAuthenticated ? (
              <Link
                href="/login?redirect=/checkout"
                className="w-full h-13 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-[#0033FF]/25 hover:shadow-xl hover:shadow-[#0033FF]/30 flex items-center justify-center cursor-pointer text-center"
              >
                Sign In to Continue Checkout &rarr;
              </Link>
            ) : !user?.emailVerifiedAt ? (
              <button
                type="button"
                disabled
                className="w-full h-13 bg-neutral-200 text-neutral-500 font-bold text-sm uppercase tracking-wider rounded-xl opacity-75 cursor-not-allowed flex items-center justify-center text-center"
              >
                Verify Email to Enable Payment
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={quoteLoading || isSubmitting}
                className="w-full h-13 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-[#0033FF]/25 hover:shadow-xl hover:shadow-[#0033FF]/30 disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {isSubmitting || quoteLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Lock className="w-4.5 h-4.5 text-white stroke-[2.5]" />
                )}
                <span>
                  Pay ₹{(finalPricePaise / 100).toLocaleString('en-IN')} with Razorpay
                </span>
              </button>
            )}

            {/* Security and Trust Signals */}
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 text-center pt-1">
              <ShieldCheck className="w-4 h-4 text-[#0033FF] shrink-0" />
              <span>256-bit SSL Encrypted • Official GST Invoice • Instant Access</span>
            </div>
          </div>

          {/* Payment Methods and Guarantees with Authentic Logos */}
          <div className="border-t border-neutral-200 pt-5 space-y-3.5 text-center">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">
              <span>Accepted Payment Methods</span>
              <span className="text-[#0033FF] font-semibold lowercase">powered by razorpay</span>
            </div>

            {/* Grid of Real Brand Logos: UPI, Visa, Mastercard, RuPay (Debit/Credit) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="h-11 px-3 bg-white rounded-lg border border-neutral-200/90 hover:border-neutral-300 flex items-center justify-center gap-1.5 transition-colors shadow-none" title="UPI (GPay, PhonePe, Paytm, BHIM)">
                <UpiLogo className="h-4.5 w-auto" />
              </div>
              <div className="h-11 px-3 bg-white rounded-lg border border-neutral-200/90 hover:border-neutral-300 flex items-center justify-center gap-1.5 transition-colors shadow-none" title="Visa Credit and Debit Cards">
                <VisaLogo className="h-4 w-auto" />
              </div>
              <div className="h-11 px-3 bg-white rounded-lg border border-neutral-200/90 hover:border-neutral-300 flex items-center justify-center gap-1.5 transition-colors shadow-none" title="Mastercard Credit and Debit Cards">
                <MastercardLogo className="h-5 w-auto" />
              </div>
              <div className="h-11 px-3 bg-white rounded-lg border border-neutral-200/90 hover:border-neutral-300 flex items-center justify-center gap-1.5 transition-colors shadow-none" title="RuPay Domestic Indian Debit and Credit Cards">
                <RuPayLogo className="h-4 w-auto" />
              </div>
            </div>

            {/* Additional payment coverage pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-neutral-600 font-medium">
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200">
                All Major Debit &amp; Credit Cards
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200">
                Net Banking (50+ Banks)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200">
                EMI Available
              </span>
            </div>
          </div>
        </div>

        {/* Footer Terms & Policy Links */}
        <div className="w-full max-w-lg mx-auto pt-6 mt-6 border-t border-neutral-200 text-center text-xs text-neutral-500 leading-normal">
          <p>
            By completing this payment, you agree to the{' '}
            <Link href="/terms" className="underline hover:text-neutral-800">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/refunds" className="underline hover:text-neutral-800">
              Refund Policy
            </Link>
            . Need assistance? Contact{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="underline hover:text-neutral-800">
              {siteConfig.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  // Sync document background to clean white so split layout renders seamlessly
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-white font-reddit selection:bg-[#0033FF] selection:text-white">
      <Suspense
        fallback={
          <div className="w-full min-h-screen flex flex-col items-center justify-center py-28 space-y-4 bg-white">
            <Loader2 className="w-10 h-10 animate-spin text-[#0033FF]" />
            <p className="text-sm font-semibold tracking-wider uppercase text-neutral-600">
              Loading Checkout Session...
            </p>
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
