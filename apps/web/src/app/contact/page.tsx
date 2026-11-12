'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import { apiClient } from '../../lib/api-client';
import {
  Mail,
  MessageSquare,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';

export default function ContactPage() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
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
      const msg = err instanceof Error ? err.message : 'Unable to submit inquiry. Please try again.';
      setErrorMessage(msg);
      toastError('Submission Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-white font-reddit selection:bg-black selection:text-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Column (Desktop Only): Signature Dot Halftone Graphic on Black */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 h-full bg-black overflow-hidden select-none">
        <Image
          src="/split-pixelated.png"
          alt="HydroBasics Industrial Hydraulic Engineer"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center mix-blend-screen opacity-95 select-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right Column: Clean White Background */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col justify-between overflow-y-auto lg:overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="w-full flex items-center justify-between px-5 pt-4 sm:px-8 sm:pt-6 shrink-0 z-20">
          <Link
            href="/"
            className="text-neutral-500 hover:text-black font-semibold text-xs sm:text-sm tracking-normal transition-colors flex items-center gap-1.5 py-1"
          >
            <span aria-hidden="true">&larr;</span> Back to Course
          </Link>

          <Link
            href="/"
            className="flex flex-col items-end -space-y-0.5 leading-[0.92] text-black hover:opacity-90 transition-opacity select-none text-right cursor-pointer"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </header>

        {/* Center Content Card */}
        <main className="my-auto w-full max-w-xl mx-auto px-4 sm:px-6 py-4 relative z-10 flex flex-col justify-center">
          <div className="relative w-full bg-white border border-neutral-200/80 rounded-none p-5 sm:p-7 select-text overflow-hidden">
            {/* Clean, compact header matching dashboard & checkout */}
            <div className="space-y-1 mb-4 sm:mb-5">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Contact Support
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                Reach our engineering desk for technical support, billing inquiries, or enterprise access.
              </p>
            </div>

            {/* Concise 1-2 line points */}
            <div className="divide-y divide-neutral-100 text-xs sm:text-[13px] text-neutral-700">
              <div className="py-2.5 sm:py-3 first:pt-0">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">01.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Direct Support Email:</strong>
                  Send technical or billing queries to{' '}
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-semibold underline text-black hover:opacity-80"
                  >
                    {siteConfig.supportEmail}
                  </a>; answered within 24 business hours.
                </p>
              </div>

              <div className="py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">02.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Helpline Phone:</strong>
                  Call or WhatsApp{' '}
                  <a
                    href={`tel:${siteConfig.contact.phone.replace(/\s+/g, '')}`}
                    className="font-semibold font-mono text-black hover:underline"
                  >
                    {siteConfig.contact.phone}
                  </a>{' '}
                  ({siteConfig.contact.hours}, closed Sundays).
                </p>
              </div>

              <div className="py-2.5 sm:py-3">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">03.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Registered Facility:</strong>
                  {siteConfig.contact.address}.
                </p>
              </div>

              <div className="py-2.5 sm:py-3 last:pb-0">
                <p className="leading-relaxed">
                  <span className="font-mono font-bold text-neutral-900 mr-2">04.</span>
                  <strong className="font-bold text-neutral-950 mr-1">Corporate &amp; Enterprise:</strong>
                  For bulk engineering enrollments, custom plant training, or GST tax invoices, reach out directly.
                </p>
              </div>
            </div>

            {/* Direct Action Bar */}
            <div className="pt-3.5 mt-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-center gap-2.5">
              <a
                href={`mailto:${siteConfig.supportEmail}?subject=HydroBasics%20Support%20Inquiry`}
                className="w-full sm:flex-1 h-10 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Support Desk &rarr;</span>
              </a>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto h-10 px-4 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 font-semibold text-xs rounded-none transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send Message Online</span>
              </button>
            </div>

            {/* Subtle metadata strip */}
            <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span>Desk: Mon–Fri, 9AM–6PM IST</span>
              <span>Response: &lt;24 Business Hours</span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto py-3 px-5 sm:px-8 text-center shrink-0">
          <nav
            aria-label="Footer Legal Links"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-neutral-500 mb-1"
          >
            <Link href="/terms" className="hover:text-black transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-black transition-colors">
              Privacy
            </Link>
            <Link href="/refunds" className="hover:text-black transition-colors">
              Refunds
            </Link>
            <Link href="/contact" className="text-black font-bold">
              Contact
            </Link>
          </nav>
          <p className="text-[11px] text-neutral-400">
            &copy; {currentYear} Hydro Basics. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Online Message Modal Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg bg-white border border-neutral-300 shadow-2xl rounded-none p-5 sm:p-7 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
              <div>
                <h2 id="contact-modal-title" className="text-lg font-bold text-neutral-900 tracking-tight">
                  Send Support Inquiry
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Our engineering team will get back to you within 24 business hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-black transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSent ? (
              <div className="py-6 text-center space-y-3 bg-neutral-50 border border-neutral-200 p-5">
                <div className="w-10 h-10 bg-black text-white inline-flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  Message Sent Successfully
                </h3>
                <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
                  Thank you for reaching out. We have received your inquiry and will respond to {email} shortly.
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
                    className="h-9 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-none transition-colors"
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
                  <div className="p-2.5 border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold rounded-none flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-neutral-300 focus:border-black rounded-none text-neutral-900 text-xs font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Email Address <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="engineer@plant.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-neutral-300 focus:border-black rounded-none text-neutral-900 text-xs font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Subject <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corporate team enrollment question"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-neutral-300 focus:border-black rounded-none text-neutral-900 text-xs font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Message <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe your inquiry..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-2.5 bg-white border border-neutral-300 focus:border-black rounded-none text-neutral-900 text-xs font-medium focus:outline-none transition-all placeholder:text-neutral-400 resize-none"
                  />
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-9 px-4 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 font-semibold text-xs rounded-none transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-9 px-5 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
