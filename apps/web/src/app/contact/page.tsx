'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react';

export default function ContactPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const currentYear = new Date().getFullYear();
  const { success: toastSuccess, error: toastError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await apiClient('/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          website: website.trim(),
        }),
      });

      setIsSent(true);
      toastSuccess(
        'Message Received',
        'Our engineering support team will respond within 24 business hours.',
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to submit inquiry. Please try again.';
      setErrorMessage(msg);
      toastError('Submission Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit selection:bg-white selection:text-black z-10 flex flex-col lg:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* LEFT CARD (Desktop Only): Signature Fractal Glass Graphic     */}
      {/* ============================================================== */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-between lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
        <Image
          src="/fractal-glass-5.jpg"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center select-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Row over Image */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <Link href="/" className="flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Full Scrollable Contact Desk (Starts Top-Left)    */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col overflow-hidden relative select-text">
        {/* Top Header Bar: Heading on left, Back link on right, lines touch outer ends */}
        <div className="px-6 sm:px-8 lg:px-10 py-4 sm:py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none bg-[#101012]">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="lg:hidden flex flex-col select-none group"
              title="HYDRO BASICS Home"
            >
              <span className="font-extrabold text-[14px] text-white leading-[1.05] tracking-wider uppercase">
                HYDRO
              </span>
              <span className="font-extrabold text-[14px] text-white leading-[1.05] tracking-wider uppercase">
                BASICS
              </span>
            </Link>
            <span className="lg:hidden text-white/30 font-mono text-xs">/</span>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Contact &amp; Support Desk
            </h1>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-[#c2c4cc]/80 hover:text-white transition-colors ml-auto"
            title="Back to Course"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Course</span>
          </Link>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-7 scroll-smooth text-left">
          {/* Contact Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-[#151619] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <h3 className="text-xs sm:text-sm font-semibold text-white">
                  Direct Support Email
                </h3>
              </div>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                For login issues, video playback assistance, and refund requests:
              </p>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-xs font-mono font-medium text-white underline hover:text-white/80 block pt-0.5"
              >
                {siteConfig.supportEmail}
              </a>
            </div>

            <div className="p-3.5 rounded-xl bg-[#151619] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <h3 className="text-xs sm:text-sm font-semibold text-white">
                  Telephone &amp; WhatsApp
                </h3>
              </div>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                Direct engineer helpline for urgent enrollment or billing inquiries:
              </p>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s+/g, '')}`}
                className="text-xs font-mono font-medium text-white underline hover:text-white/80 block pt-0.5"
              >
                {siteConfig.contact.phone}
              </a>
            </div>

            <div className="p-3.5 rounded-xl bg-[#151619] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <h3 className="text-xs sm:text-sm font-semibold text-white">
                  Corporate &amp; Plant Training
                </h3>
              </div>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                Custom cohort training for factory engineering teams and bulk B2B purchase orders.
              </p>
              <span className="text-[11px] font-mono text-emerald-400 block pt-0.5">
                GST B2B Invoices Included
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#151619] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <h3 className="text-xs sm:text-sm font-semibold text-white">Registered Facility</h3>
              </div>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                Operating headquarters and legal notice address:
              </p>
              <p className="text-xs font-mono text-white/90 pt-0.5">{siteConfig.contact.address}</p>
            </div>
          </div>

          {/* Divider line touching outer ends */}
          <div className="-mx-6 sm:-mx-8 lg:-mx-10 border-b border-white/[0.08]" />

          {/* Embedded Message Form: Included directly within page content */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Send an Online Message
              </h2>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                Fill out the form below and our technical operations desk will respond within 24
                business hours.
              </p>
            </div>

            {isSent ? (
              <div className="p-5 text-center space-y-3 bg-[#151619] border border-white/[0.08] rounded-xl">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Message Sent Successfully</h3>
                <p className="text-xs text-[#c2c4cc] max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out. We have received your inquiry and will reply to{' '}
                  <span className="text-white font-medium">{email}</span> within 24 business hours.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSent(false);
                      setName('');
                      setEmail('');
                      setSubject('');
                      setMessage('');
                    }}
                    className="h-8 px-4 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="p-4 sm:p-5 rounded-xl bg-[#151619] border border-white/[0.08] space-y-3.5"
              >
                {/* Honeypot field */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website-field">Website</label>
                  <input
                    id="website-field"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs font-medium rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#c2c4cc] block mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-9 px-3 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c2c4cc] block mb-1">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="engineer@plant.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#c2c4cc] block mb-1">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corporate team enrollment question"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-9 px-3 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#c2c4cc] block mb-1">
                    Message <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe your inquiry..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-3 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 select-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <span>Send Message &rarr;</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Divider line touching outer ends */}
          <div className="-mx-6 sm:-mx-8 lg:-mx-10 border-b border-white/[0.08]" />

          {/* Operational Hours Strip */}
          <div className="p-3.5 rounded-xl bg-[#151619] border border-white/[0.08] space-y-1.5 text-xs">
            <h3 className="font-semibold text-white">
              Desk Working Hours &amp; Response Guarantee
            </h3>
            <p className="text-[#c2c4cc] leading-relaxed">
              Our engineering helpdesk operates <strong>{siteConfig.contact.hours}</strong> (Closed
              Sundays and Indian National Holidays). All inquiries received via email or form
              submission receive a personalized engineering response within{' '}
              <strong>24 business hours</strong>.
            </p>
          </div>
        </div>

        {/* Bottom Legal Navigation Bar: lines touch outer ends */}
        <div className="px-6 sm:px-8 lg:px-10 py-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none shrink-0 bg-[#101012]">
          <nav aria-label="Footer Legal Links" className="flex items-center gap-4 text-xs">
            <Link href="/terms" className="text-[#80828d] hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-[#80828d] hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/refunds" className="text-[#80828d] hover:text-white transition-colors">
              Refunds
            </Link>
            <Link href="/contact" className="text-white font-semibold">
              Contact
            </Link>
          </nav>
          <p className="text-[11px] text-[#5d5f6a]">
            &copy; {currentYear} Hydro Basics. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
