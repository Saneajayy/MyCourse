'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { Mail, MessageSquare, X, Loader2, CheckCircle2, AlertCircle, Send, ArrowLeft, Clock, Phone, MapPin, Building2 } from 'lucide-react';

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

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
          <span className="text-[11px] font-mono tracking-wider text-white/70 px-2.5 py-1 rounded bg-black/40 border border-white/10 backdrop-blur-md">
            Support &amp; Operations
          </span>
        </div>

        {/* Bottom Highlights over Left Card Image */}
        <div className="relative z-10 w-full space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Mon–Fri, 9:00 AM – 6:00 PM IST</span>
          </div>
          <p className="text-xs text-[#c2c4cc]/80 leading-relaxed max-w-sm">
            Technical troubleshooting desk, corporate plant training coordination, and enrollment assistance.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT CARD: Full Scrollable Contact Desk (Starts Top-Left)    */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col overflow-y-auto relative p-6 sm:p-8 lg:p-10 select-text scroll-smooth">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] shrink-0 select-none">
          <Link href="/" className="lg:hidden flex flex-col select-none group" title="HYDRO BASICS Home">
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] text-white leading-[1.05] tracking-wider uppercase">
              BASICS
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-[#c2c4cc]/80 hover:text-white transition-colors ml-auto"
            title="Back to Course"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Course</span>
          </Link>
        </div>

        {/* Main Document Body */}
        <div className="pt-6 pb-12 space-y-8 max-w-2xl text-left">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-white/80 px-2.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                Desk Response: &lt;24 Business Hours
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                • Operations Live
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Engineering Support &amp; Contact Desk
            </h1>

            <p className="text-xs sm:text-sm text-[#c2c4cc] leading-relaxed">
              Have questions regarding curriculum access, GST tax invoices, circuit blueprints, or enterprise plant training? Our technical operations desk is available to assist you.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 select-none">
            <a
              href={`mailto:${siteConfig.supportEmail}?subject=HydroBasics%20Support%20Inquiry`}
              className="w-full sm:flex-1 h-11 px-5 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Email Support Desk &rarr;</span>
            </a>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto h-11 px-5 rounded-lg border border-white/[0.1] hover:border-white/[0.18] bg-[#1b1c20] hover:bg-[#22242a] text-[#c2c4cc] hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send Message Online</span>
            </button>
          </div>

          <div className="border-t border-white/[0.08]" />

          {/* Contact Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#151619] border border-white/[0.08] space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Direct Support Email</h3>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                For student login assistance, video playback issues, and refund requests:
              </p>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-xs font-mono font-medium text-white underline hover:text-white/80 block pt-1"
              >
                {siteConfig.supportEmail}
              </a>
            </div>

            <div className="p-4 rounded-xl bg-[#151619] border border-white/[0.08] space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Telephone &amp; WhatsApp</h3>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                Direct engineer helpline for urgent enrollment or billing inquiries:
              </p>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s+/g, '')}`}
                className="text-xs font-mono font-medium text-white underline hover:text-white/80 block pt-1"
              >
                {siteConfig.contact.phone}
              </a>
            </div>

            <div className="p-4 rounded-xl bg-[#151619] border border-white/[0.08] space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Corporate &amp; Plant Training</h3>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                Custom cohort training for factory engineering teams and bulk B2B purchase orders.
              </p>
              <span className="text-xs font-mono text-emerald-400 block pt-1">
                GST B2B Invoices Included
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#151619] border border-white/[0.08] space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Registered Facility</h3>
              <p className="text-xs text-[#c2c4cc] leading-relaxed">
                Operating headquarters and legal notice address:
              </p>
              <p className="text-xs font-mono text-white/90 pt-1">
                {siteConfig.contact.address}
              </p>
            </div>
          </div>

          {/* Operational Hours Strip */}
          <div className="p-4 rounded-xl bg-[#151619] border border-white/[0.08] space-y-2 text-xs">
            <h3 className="font-semibold text-white">Desk Working Hours &amp; Response Guarantee</h3>
            <p className="text-[#c2c4cc] leading-relaxed">
              Our engineering helpdesk operates <strong>{siteConfig.contact.hours}</strong> (Closed Sundays and Indian National Holidays). All inquiries received via email or form submission receive a personalized engineering response within <strong>24 business hours</strong>.
            </p>
          </div>

          {/* Bottom Legal Navigation Bar */}
          <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none">
            <nav
              aria-label="Footer Legal Links"
              className="flex items-center gap-4 text-xs"
            >
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

      {/* Online Message Modal Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg bg-[#101012] border border-white/[0.1] shadow-2xl rounded-xl p-5 sm:p-7 space-y-4 text-white">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <h2
                  id="contact-modal-title"
                  className="text-lg font-bold text-white tracking-tight"
                >
                  Send Support Inquiry
                </h2>
                <p className="text-xs text-[#c2c4cc] mt-0.5">
                  Our engineering team will get back to you within 24 business hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#80828d] hover:text-white transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSent ? (
              <div className="py-6 text-center space-y-3 bg-[#18191d] border border-white/[0.08] rounded-lg p-5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Message Sent Successfully</h3>
                <p className="text-xs text-[#c2c4cc] max-w-xs mx-auto leading-relaxed">
                  Thank you for reaching out. We have received your inquiry and will respond to{' '}
                  <span className="text-white font-medium">{email}</span> shortly.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSent(false);
                      setName('');
                      setEmail('');
                      setSubject('');
                      setMessage('');
                      setIsModalOpen(false);
                    }}
                    className="h-9 px-5 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
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
                      className="w-full h-10 px-3.5 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a]"
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
                      className="w-full h-10 px-3.5 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a]"
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
                    className="w-full h-10 px-3.5 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a]"
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
                    className="w-full p-3 bg-[#18191d] border border-white/[0.08] focus:border-white/20 rounded-lg text-white text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-[#5d5f6a] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-10 px-4 rounded-lg border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] hover:bg-[#22242a] text-[#c2c4cc] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-10 px-5 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
