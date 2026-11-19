'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import { Mail, MessageSquare, X, Loader2, CheckCircle2, AlertCircle, Send, ArrowLeft } from 'lucide-react';

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
      <div className="hidden lg:relative lg:flex lg:flex-col lg:w-1/2 h-full bg-[#101012] border border-white/[0.08] rounded-xl overflow-hidden select-none p-6 sm:p-8 shrink-0">
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
      {/* RIGHT CARD: Contact Support Content                           */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 lg:w-1/2 lg:h-full bg-[#101012] border border-white/[0.08] rounded-xl flex flex-col justify-between overflow-y-auto relative p-5 sm:p-7 select-text">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0 select-none">
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
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-[#c2c4cc]/70 hover:text-white transition-colors ml-auto"
            title="Back to Course"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to Course</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="my-auto py-5 space-y-4 max-w-xl mx-auto w-full">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Contact Support
            </h1>
            <p className="text-xs sm:text-sm text-[#c2c4cc] leading-relaxed mt-1">
              Reach our engineering desk for technical support, billing inquiries, or enterprise access.
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#151619] overflow-hidden divide-y divide-white/[0.06] text-xs sm:text-[13px] text-[#c2c4cc]">
            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">01.</span>
                <strong className="font-semibold text-white mr-1.5">Direct Support Email:</strong>
                Send technical or billing queries to{' '}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="font-medium underline text-white hover:text-white/80 transition-colors"
                >
                  {siteConfig.supportEmail}
                </a>
                ; answered within 24 business hours.
              </p>
            </div>

            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">02.</span>
                <strong className="font-semibold text-white mr-1.5">Helpline Phone:</strong>
                Call or WhatsApp{' '}
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/\s+/g, '')}`}
                  className="font-medium font-mono text-white underline hover:text-white/80 transition-colors"
                >
                  {siteConfig.contact.phone}
                </a>{' '}
                ({siteConfig.contact.hours}, closed Sundays).
              </p>
            </div>

            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">03.</span>
                <strong className="font-semibold text-white mr-1.5">Registered Facility:</strong>
                {siteConfig.contact.address}.
              </p>
            </div>

            <div className="p-3.5 sm:p-4">
              <p className="leading-relaxed">
                <span className="font-mono font-semibold text-white/50 mr-2">04.</span>
                <strong className="font-semibold text-white mr-1.5">Corporate &amp; Enterprise:</strong>
                For bulk engineering enrollments, custom plant training, or GST tax invoices, reach out directly.
              </p>
            </div>

            {/* Direct Action Bar */}
            <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#0c0d0e]/60 flex flex-col sm:flex-row items-center gap-2.5">
              <a
                href={`mailto:${siteConfig.supportEmail}?subject=HydroBasics%20Support%20Inquiry`}
                className="w-full sm:flex-1 h-9 sm:h-10 px-4 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Support Desk &rarr;</span>
              </a>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto h-9 sm:h-10 px-4 rounded-lg border border-white/[0.08] hover:border-white/[0.14] bg-[#1b1c20] hover:bg-[#22242a] text-[#c2c4cc] hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send Message Online</span>
              </button>
            </div>

            <div className="px-4 py-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#80828d] bg-[#0c0d0e]">
              <span>Desk: Mon–Fri, 9AM–6PM IST</span>
              <span>Response: &lt;24 Business Hours</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs select-none shrink-0">
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
