'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import {
  Mail,
  MapPin,
  Clock,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';

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
        {/* Soft overlay gradient for subtle depth */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#000000]/80 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right Column: Clean White Background with Scrollable Content */}
      <div className="w-full lg:w-1/2 h-full bg-white flex flex-col overflow-y-auto relative">
        {/* Top Header Bar inside right side area */}
        <header className="w-full flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8 shrink-0 z-20">
          <Link
            href="/"
            className="text-neutral-600 hover:text-black font-semibold text-xs sm:text-sm tracking-normal transition-colors flex items-center gap-1.5 py-1"
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

        {/* Content Container */}
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10 flex-1">
          {/* Main Card with thin solid black border matching login & signup cards */}
          <div className="relative w-full bg-white border border-black rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 select-text overflow-hidden shadow-none">
            {/* Document Header */}
            <header className="mb-8 border-b border-neutral-200 pb-6 sm:pb-8">
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-2.5">
                <Mail className="w-4 h-4 text-black shrink-0" />
                <span>Engineering Support Desk</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-950 uppercase tracking-tight">
                Contact Support
              </h1>
              <p className="text-neutral-600 font-medium text-xs sm:text-sm mt-2 leading-relaxed">
                Have questions about the industrial curriculum, enterprise access, or billing? Reach out to our engineering support desk.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-neutral-100 text-[11px] sm:text-xs font-mono text-neutral-500">
                <span>Response Time: Within 24 Business Hours</span>
                <span>Support Desk: Active</span>
              </div>
            </header>

            {/* Support Desk Details Cards */}
            <div className="space-y-3 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Card */}
                <div className="p-3.5 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Direct Email</span>
                  </div>
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="text-xs sm:text-sm font-bold text-neutral-950 hover:underline block truncate"
                  >
                    {siteConfig.supportEmail}
                  </a>
                  <p className="text-[11px] text-neutral-500">
                    Typically replied within 24 hrs
                  </p>
                </div>

                {/* Hours Card */}
                <div className="p-3.5 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Desk Hours</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-neutral-950">
                    {siteConfig.contact.hours}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Mon–Sat (Closed Sundays)
                  </p>
                </div>
              </div>

              {/* Office & Phone */}
              <div className="p-3.5 sm:p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-start gap-2 text-neutral-700">
                  <MapPin className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-950">Registered Office: </span>
                    <span className="text-neutral-600">{siteConfig.contact.address}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 pt-1 border-t border-neutral-200/80">
                  <Phone className="w-3.5 h-3.5 text-black shrink-0" />
                  <div>
                    <span className="font-bold text-neutral-950">Phone: </span>
                    <span className="font-mono text-neutral-800">{siteConfig.contact.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inquiry Form Section */}
            <div className="border-t border-neutral-200 pt-6 sm:pt-8">
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-4 h-4 text-black shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-neutral-950">
                  Send an Inquiry
                </h2>
              </div>

              {isSent ? (
                <div className="py-8 text-center space-y-3 bg-neutral-50 border border-neutral-200 rounded-xl p-6">
                  <div className="w-10 h-10 bg-black text-white rounded-full inline-flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                    Inquiry Submitted Successfully
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. A confirmation ticket has been logged and our engineering team will get back to you within 24 business hours.
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
                      }}
                      className="inline-flex items-center justify-center h-9 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot field (hidden from screen reader and visual users) */}
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
                    <div className="p-3 border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                        className="w-full h-10 px-3 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400"
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
                        className="w-full h-10 px-3 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Subject / Topic <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Corporate enrollment for 10 engineers"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-10 px-3 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Inquiry Details <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please describe your question or requirements in detail..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400 resize-none"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Transmitting Message...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Support Inquiry</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Quick Legal Nav below card */}
          <footer className="mt-6 sm:mt-8 pb-4 text-center">
            <nav
              aria-label="Footer Legal Links"
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-neutral-500 mb-2"
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
              © {currentYear} Hydro Basics. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
