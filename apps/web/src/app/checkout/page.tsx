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
  Tag,
  AlertTriangle,
  Lock,
  MailCheck,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { computeOrderTotals, TaxConfig } from '../../lib/tax';

interface CourseProduct {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  compareAtPricePaise?: number | null;
  validityDays: number;
  description?: string;
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

function GPayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Google Pay">
      <g transform="translate(0, 1) scale(0.72)">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </g>
      <text
        x="19.5"
        y="14.5"
        fill="#5F6368"
        fontSize="14"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, 'Google Sans', Roboto, sans-serif"
        letterSpacing="-0.02em"
      >
        Pay
      </text>
    </svg>
  );
}

function VisaLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="3.5 1.2 43 15.5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
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
    <svg className={className} viewBox="2 2 34 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
      <circle cx="12" cy="12" r="10" fill="#EB001B" />
      <circle cx="26" cy="12" r="10" fill="#F79E1B" />
      <path
        d="M19 5.35C20.9 6.9 22.1 9.3 22.1 12C22.1 14.7 20.9 17.1 19 18.65C17.1 17.1 15.9 14.7 15.9 12C15.9 9.3 17.1 6.9 19 5.35Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function PaytmLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 1 54 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Paytm">
      <text
        x="0"
        y="15.5"
        fill="#002970"
        fontSize="17"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        letterSpacing="-0.03em"
      >
        Pay
      </text>
      <text
        x="32"
        y="15.5"
        fill="#00BAF2"
        fontSize="17"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        letterSpacing="-0.03em"
      >
        tm
      </text>
    </svg>
  );
}

function RazorpayLogo({ className = 'h-3.5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 88 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Razorpay">
      <g transform="translate(0, 1) scale(0.72)">
        <path
          d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z"
          fill="#0033FF"
        />
      </g>
      <text
        x="19"
        y="14.5"
        fill="#0C2340"
        fontSize="13.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.02em"
      >
        Razorpay
      </text>
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
            compareAtPricePaise: data.data.compareAtPricePaise || 999900,
            validityDays: data.data.validityDays || 365,
            description: data.data.description,
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
          compareAtPricePaise: 999900,
          validityDays: 365,
          description: 'Comprehensive industrial hydraulic engineering: valve schematics, pump selection, fluid power, and field troubleshooting.',
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
      if (user.name) {
        const parts = user.name.trim().split(/\s+/);
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
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
  const finalPricePaise = quote?.totalPaise ?? basePricePaise;

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

    if (!firstName.trim()) {
      const msg = 'Please enter your first name.';
      setCheckoutError(msg);
      toastError('First Name Required', msg);
      return;
    }

    if (!lastName.trim()) {
      const msg = 'Please enter your last name.';
      setCheckoutError(msg);
      toastError('Last Name Required', msg);
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!phone.trim()) {
      const msg = 'Please enter your mobile phone number to receive your course receipt.';
      setCheckoutError(msg);
      toastError('Phone Number Required', msg);
      return;
    }

    if (!/^[0-9+ -]{10,15}$/.test(phone.trim())) {
      const msg = 'Please enter a valid 10 to 15 digit phone number.';
      setCheckoutError(msg);
      toastError('Invalid Phone', msg);
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
            name: fullName,
            email: email.trim(),
            phone: phone.trim(),
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
          name: fullName,
          email: email.trim(),
          contact: phone.trim(),
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
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden bg-white font-reddit selection:bg-[#0033FF] selection:text-white flex flex-col lg:flex-row">
      {/* ============================================================== */}
      {/* LEFT COLUMN (Desktop Only): Signature Halftone Graphic         */}
      {/* (100% identical styling to Login & Register split view)       */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-end lg:w-1/2 h-full bg-[#00186B] overflow-hidden select-none p-6 sm:p-8">
        {/* Full-Bleed Signature Dot Halftone Graphic */}
        <Image
          src="/login-pixelated.png"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center mix-blend-screen opacity-95 select-none"
        />
        {/* Soft overlay gradient for subtle depth */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#000c3b]/95 via-[#000c3b]/45 to-transparent pointer-events-none"
          aria-hidden="true"
        />
        {/* Price & Coupon Controls (Directly on Image, No Card) */}
        <div className="relative z-10 w-full mb-6 select-none">
          <div className="flex items-end justify-between gap-4">
            {/* Coupon Code Entry: Apply button then input bar */}
            <div className="shrink-0">
              {appliedCoupon ? (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-emerald-500/25 border border-emerald-400/50 backdrop-blur-sm text-emerald-200 text-sm shadow-md">
                  <div className="flex items-center gap-2 truncate">
                    <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono font-bold tracking-wide">{appliedCoupon.code}</span>
                    <span className="text-emerald-300 font-semibold text-xs">
                      (-₹{(discountPaise / 100).toLocaleString('en-IN')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-white hover:text-rose-200 underline text-xs font-bold cursor-pointer shrink-0 ml-1.5"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="relative">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={couponLoading}
                      className="h-11 px-5 bg-white hover:bg-blue-50 active:bg-blue-100 text-[#00186B] font-extrabold text-sm rounded-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 shrink-0 shadow-md"
                    >
                      {couponLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#00186B]" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder="COUPON CODE"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="h-11 w-44 sm:w-56 md:w-64 rounded-md border border-white/45 bg-transparent px-3.5 text-sm font-mono uppercase text-white placeholder:text-blue-200/60 focus:border-white focus:outline-none transition-all"
                    />
                  </div>
                  {couponError && (
                    <p className="absolute -bottom-5 left-0 text-[11px] font-semibold text-rose-300 flex items-center gap-1 drop-shadow">
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{couponError}</span>
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Final Price on the Right */}
            <div className="flex flex-col items-end shrink-0 text-right">
              <span className="text-[11px] uppercase font-bold tracking-wider text-blue-200/80 drop-shadow">
                Final Price
              </span>
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-lg leading-none">
                ₹{(finalPricePaise / 100).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Refund Disclaimer (Desktop Only - Bottom of Left Section) */}
        <div className="relative z-10 text-center text-xs text-blue-100/75 space-y-1">
          <p>
            By completing this payment, you agree to the{' '}
            <Link href="/terms" className="underline text-white hover:text-cyan-200">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/refunds" className="underline text-white hover:text-cyan-200">
              Refund Policy
            </Link>
            .
          </p>
          <p className="text-[11px] text-blue-100/60">
            Need assistance? Contact{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="underline text-white hover:text-cyan-200">
              {siteConfig.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Clean Single Scroll (Mobile & Desktop)           */}
      {/* ============================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen lg:min-h-0 lg:h-full bg-white text-neutral-900 flex flex-col relative overflow-y-auto">
        {/* Desktop Top Header Bar: Pinned into top corners */}
        <header className="hidden lg:flex w-full items-center justify-between px-6 pt-5 sm:px-8 sm:pt-6 md:px-10 shrink-0 z-20">
          {/* Top-Left Corner: Already Enrolled / Sign In (hidden when signed in) */}
          <div>
            {!isAuthenticated && (
              <div className="text-xs sm:text-sm text-neutral-600">
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

          {/* Top-Right Corner: Brand Logo deeply in corner */}
          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-[#0033FF] hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
            aria-label="HYDRO BASICS Home - Back to Course"
          >
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] sm:text-[22px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </header>

        {/* Mobile Upper Part: Full-bleed edge-to-edge halftone image taking up whole upper screen */}
        <div className="lg:hidden relative w-full h-[250px] sm:h-[280px] bg-[#00186B] shrink-0 overflow-hidden select-none flex flex-col justify-between p-4 sm:p-5">
          {/* Full-Bleed Signature Dot Halftone Graphic */}
          <Image
            src="/login-pixelated.png"
            alt="HydroBasics Industrial Hydraulic Engineer"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center mix-blend-screen opacity-95 select-none"
          />
          {/* Soft overlay gradient for subtle depth */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#000c3b]/95 via-[#000c3b]/35 to-[#000c3b]/45 pointer-events-none"
            aria-hidden="true"
          />

          {/* Top Bar inside Mobile Upper Part */}
          <div className="relative z-10 w-full flex items-center justify-between">
            <div>
              {!isAuthenticated && (
                <div className="text-xs text-blue-100 font-medium">
                  Already enrolled?{' '}
                  <Link
                    href="/login?redirect=/checkout"
                    className="font-bold text-white underline hover:text-cyan-200 ml-0.5"
                  >
                    Sign In &rarr;
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/"
              className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
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

          {/* Bottom Controls inside Mobile Upper Part */}
          <div className="relative z-10 w-full">
            <div className="flex items-end justify-between gap-3">
              {/* Coupon Code Entry: Apply button then input bar extending horizontally */}
              <div className="flex-1 min-w-0">
                {appliedCoupon ? (
                  <div className="h-11 flex items-center gap-1.5 px-3 rounded-md bg-emerald-500/25 border border-emerald-400/50 backdrop-blur-sm text-emerald-200 text-xs">
                    <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono font-bold tracking-wide truncate">{appliedCoupon.code}</span>
                    <span className="text-emerald-300 font-semibold text-[11px] shrink-0">
                      (-₹{(discountPaise / 100).toLocaleString('en-IN')})
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-white hover:text-rose-200 underline text-[11px] font-bold cursor-pointer shrink-0 ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="relative w-full">
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="submit"
                        disabled={couponLoading}
                        className="h-11 px-4 bg-white hover:bg-blue-50 active:bg-blue-100 text-[#00186B] font-extrabold text-xs sm:text-sm rounded-md transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 shrink-0 shadow-sm"
                      >
                        {couponLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00186B]" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                      <input
                        type="text"
                        placeholder="COUPON CODE"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="h-11 flex-1 min-w-0 rounded-md border border-white/45 bg-transparent px-3 text-xs sm:text-sm font-mono uppercase text-white placeholder:text-blue-200/60 focus:border-white focus:outline-none transition-all"
                      />
                    </div>
                    {couponError && (
                      <p className="absolute -bottom-5 left-0 text-[10px] font-semibold text-rose-300 flex items-center gap-0.5 drop-shadow truncate max-w-full">
                        <X className="w-3 h-3 stroke-[2.5] shrink-0" />
                        <span className="truncate">{couponError}</span>
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Final Price on the Right (No 9,999) */}
              <div className="flex flex-col items-end shrink-0 text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200/80 drop-shadow">
                  Final Price
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-lg leading-none">
                  ₹{(finalPricePaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Centered Order & Billing Container */}
        <div className="m-auto w-full max-w-lg px-4 sm:px-6 py-6 sm:py-8 relative z-10 space-y-4">
          {/* Email Verification Warning Alert Gate */}
          {isAuthenticated && !user?.emailVerifiedAt && (
            <div className="w-full bg-[#FEF3C7] border border-amber-300 rounded-xl p-5 text-amber-950">
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
                    className="h-9 px-3.5 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center cursor-pointer"
                  >
                    Enter 6-Digit OTP
                  </Link>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="h-9 px-3 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-bold text-xs rounded-lg transition-all flex items-center cursor-pointer disabled:opacity-60"
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
                    className="h-9 px-3 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-bold text-xs rounded-lg transition-all flex items-center cursor-pointer disabled:opacity-60"
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

          {/* Billing Info Card Box - Identical styling to Login / Signup / Verify-Email cards */}
          <div className="relative w-full bg-white border border-neutral-200/80 rounded-xl sm:rounded-2xl p-5 sm:p-7 select-none overflow-hidden space-y-5">
            {/* Simple Billing Information Headline */}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Billing Information
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                Enter your student contact and tax invoice information.
              </p>
            </div>

            {/* Billing Form Fields */}
            <div className="space-y-4 pt-0.5">
              {/* First Name & Last Name in one single row */}
              <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                <div className="space-y-1.5 text-left">
                  <label htmlFor="checkout-first-name" className="text-sm font-bold text-neutral-900 block">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="checkout-first-name"
                    type="text"
                    required
                    placeholder="Ramesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label htmlFor="checkout-last-name" className="text-sm font-bold text-neutral-900 block">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="checkout-last-name"
                    type="text"
                    required
                    placeholder="Kumar"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="checkout-email" className="text-sm font-bold text-neutral-900 block">
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
                  className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all disabled:bg-neutral-100 disabled:text-neutral-600 disabled:cursor-not-allowed"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="checkout-phone" className="text-sm font-bold text-neutral-900 block">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#0033FF] focus:ring-2 focus:ring-[#0033FF]/15 focus:outline-none transition-all font-mono"
                />
              </div>

              {/* Company GSTIN */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="checkout-gstin" className="text-sm font-bold text-neutral-900 block">
                  Company GSTIN
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
            <div className="pt-2">
              {!isAuthenticated ? (
                <Link
                  href="/login?redirect=/checkout"
                  className="w-full h-[50px] sm:h-[54px] px-6 py-3.5 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-base sm:text-[17px] rounded-lg transition-all flex items-center justify-center cursor-pointer text-center select-none"
                >
                  Sign In to Continue Checkout &rarr;
                </Link>
              ) : !user?.emailVerifiedAt ? (
                <button
                  type="button"
                  disabled
                  className="w-full h-[50px] sm:h-[54px] px-6 py-3.5 bg-neutral-200 text-neutral-500 font-bold text-sm sm:text-base uppercase tracking-wider rounded-lg opacity-75 cursor-not-allowed flex items-center justify-center text-center select-none"
                >
                  Verify Email to Enable Payment
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={quoteLoading || isSubmitting}
                  className="w-full h-[50px] sm:h-[54px] px-6 py-3.5 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-base sm:text-[17px] rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer select-none"
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
            </div>

            {/* Payment Methods and Security Guarantee */}
            <div className="-mx-5 sm:-mx-7 border-t border-neutral-200/80 pt-4 px-5 sm:px-7 space-y-2 text-center">
              {/* Secured by Razorpay in Center */}
              <div className="flex items-center justify-center gap-1.5 text-neutral-600 text-xs sm:text-[13px] font-medium">
                <span>Secured by</span>
                <RazorpayLogo className="h-4 sm:h-[18px] w-auto" />
              </div>

              {/* Accepted Payment Methods under Secured by Razorpay */}
              <div className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
                Accepted Payment Methods
              </div>

              {/* Real Brand Logos in One Single Row: GPay, Visa, Mastercard, Paytm */}
              <div className="flex items-center justify-center gap-5 sm:gap-6 pt-0.5 pb-0.5 flex-nowrap">
                <div title="Google Pay (GPay)" className="shrink-0 flex items-center justify-center translate-x-1">
                  <GPayLogo className="h-[18px] sm:h-[21px] w-auto" />
                </div>
                <div title="Visa" className="shrink-0 flex items-center justify-center">
                  <VisaLogo className="h-[14px] sm:h-[16px] w-auto" />
                </div>
                <div title="Mastercard" className="shrink-0 flex items-center justify-center">
                  <MastercardLogo className="h-[18px] sm:h-[21px] w-auto" />
                </div>
                <div title="Paytm" className="shrink-0 flex items-center justify-center">
                  <PaytmLogo className="h-[17px] sm:h-[20px] w-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Refund Disclaimer (Mobile Only - Below Billing Info) */}
          <div className="lg:hidden pt-1 text-center text-xs text-neutral-500 space-y-1">
            <p>
              By completing this payment, you agree to the{' '}
              <Link href="/terms" className="underline hover:text-neutral-800">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/refunds" className="underline hover:text-neutral-800">
                Refund Policy
              </Link>
              .
            </p>
            <p className="text-[11px] text-neutral-400">
              Need assistance? Contact{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="underline hover:text-neutral-700">
                {siteConfig.supportEmail}
              </a>
              .
            </p>
          </div>
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
