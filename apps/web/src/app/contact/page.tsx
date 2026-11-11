'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '../../config/site';
import { useToast } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
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

function ContactNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-neutral-200 select-none">
      <nav
        aria-label="Contact Navigation"
        className="w-full max-w-5xl mx-auto h-16 sm:h-20 px-6 sm:px-8 md:px-12 flex items-center justify-between"
      >
        {/* Left Side: Brand Logo + Back to Course Link */}
        <div className="flex items-center gap-5 sm:gap-7">
          <Link
            href="/"
            className="flex flex-col justify-center -space-y-0.5 leading-[0.92] text-black hover:opacity-80 transition-opacity"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[18px] sm:text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>

          <div className="h-5 w-px bg-neutral-200" aria-hidden="true" />

          <Link
            href="/"
            className="text-neutral-600 hover:text-black font-semibold text-xs sm:text-sm tracking-normal transition-colors py-2 flex items-center gap-1.5"
          >
            <span aria-hidden="true">&larr;</span> Back to Course
          </Link>
        </div>

        {/* Right Side: Account / Login */}
        <div className="flex items-center">
          {isAuthenticated ? (
            <Link
              href="/my-courses"
              className="text-xs sm:text-sm font-bold text-neutral-900 hover:text-black px-3.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              My Courses
            </Link>
          ) : (
            <Link
              href="/login?redirect=/contact"
              className="text-xs sm:text-sm font-bold text-neutral-900 hover:text-black px-3.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function ContactFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-neutral-200 bg-white select-none py-10 sm:py-12 mt-16 sm:mt-24">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <Link
            href="/"
            className="flex flex-col -space-y-0.5 leading-[0.92] text-black hover:opacity-80 transition-opacity"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[16px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[16px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
          <span className="hidden sm:inline text-neutral-300">|</span>
          <p className="text-xs text-neutral-500">
            © {currentYear} Hydro Basics. Industrial Hydraulic Engineering Masterclass.
          </p>
        </div>

        <nav
          aria-label="Footer Legal Links"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-neutral-600"
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
      </div>
    </footer>
  );
}

export default function ContactPage() {
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
    <div className="min-h-screen bg-white text-neutral-900 font-reddit selection:bg-black selection:text-white flex flex-col justify-between">
      {/* Sticky White Navigation */}
      <ContactNavbar />

      {/* Main Document Content */}
      <main className="w-full max-w-5xl mx-auto px-6 sm:px-8 md:px-12 py-10 sm:py-14 md:py-16 flex-1 select-text">
        {/* Document Header */}
        <header className="mb-10 sm:mb-12 border-b border-neutral-200 pb-8 sm:pb-10">
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-neutral-500 uppercase tracking-widest mb-3">
            <Mail className="w-4 h-4 text-black shrink-0" />
            <span>Engineering Support Desk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 uppercase tracking-tight">
            Contact Support
          </h1>
          <p className="text-neutral-600 font-medium text-sm sm:text-base mt-3 max-w-2xl leading-relaxed">
            Have questions about the industrial curriculum, enterprise access, or billing? Reach out to our engineering support desk.
          </p>
        </header>

        {/* 2-Column Content Grid: Contact Details (Left) + Inquiry Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-start">
          {/* Left Column: Contact Channels */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card: Direct Email */}
            <div className="p-5 sm:p-6 bg-neutral-50 border border-neutral-200/90 rounded-xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Direct Support Email
                </span>
              </div>
              <div className="pt-1">
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="text-base font-bold text-neutral-950 hover:underline block"
                >
                  {siteConfig.supportEmail}
                </a>
                <p className="text-xs text-neutral-500 mt-1">
                  Typical response time: Within 24 business hours
                </p>
              </div>
            </div>

            {/* Card: Support Desk Hours */}
            <div className="p-5 sm:p-6 bg-neutral-50 border border-neutral-200/90 rounded-xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Support Desk Hours
                </span>
              </div>
              <div className="pt-1">
                <div className="text-sm font-bold text-neutral-950">
                  {siteConfig.contact.hours}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Closed on Sundays and national public holidays
                </p>
              </div>
            </div>

            {/* Card: Registered Office & Phone */}
            <div className="p-5 sm:p-6 bg-neutral-50 border border-neutral-200/90 rounded-xl space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Registered Office
                  </span>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed pl-11">
                  {siteConfig.contact.address}
                </p>
              </div>

              <div className="h-px bg-neutral-200/70" aria-hidden="true" />

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Phone Inquiries
                  </span>
                </div>
                <p className="text-sm font-bold font-mono text-neutral-950 pl-11">
                  {siteConfig.contact.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Message Form */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-neutral-200/90 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-neutral-200 pb-5">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-950 tracking-tight">
                    Send an Inquiry
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Fill out the details below and our engineers will reply via email.
                  </p>
                </div>
              </div>

              {isSent ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-neutral-100 text-black rounded-full inline-flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-950 tracking-tight">
                    Inquiry Submitted Successfully
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. A confirmation ticket has been logged and our engineering team will get back to you within 24 business hours.
                  </p>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSent(false);
                        setName('');
                        setEmail('');
                        setSubject('');
                        setMessage('');
                      }}
                      className="inline-flex items-center justify-center h-10 px-5 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
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
                    <div className="p-3.5 border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                        Email Address <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="engineer@plant.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                      Subject / Topic <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Corporate enrollment for 10 engineers"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                      Inquiry Details <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Please describe your question or requirements in detail..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-3.5 bg-neutral-50 border border-neutral-300 focus:border-black rounded-lg text-neutral-900 text-sm font-medium focus:outline-none transition-all placeholder:text-neutral-400 resize-none"
                    />
                  </div>

                  <div className="pt-2">
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
        </div>
      </main>

      {/* Clean White Minimal Footer */}
      <ContactFooter />
    </div>
  );
}
