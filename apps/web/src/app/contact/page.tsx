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
import { LandingFooter } from '../../components/landing/LandingFooter';

function ContactNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Contact Navigation"
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

          <Link
            href="/"
            className="text-white/80 hover:text-white font-semibold text-sm sm:text-base tracking-normal transition-colors py-2 flex items-center gap-2"
          >
            <span aria-hidden="true">&larr;</span> Back to Course
          </Link>
        </div>

        {/* Right Side: Account / Login Cell */}
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
                href="/login?redirect=/contact"
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
    <div className="bg-[#0033FF] min-h-screen text-white font-reddit relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px] flex flex-col justify-between">
      {/* Background Noise Texture */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Floating Glass Navigation */}
      <ContactNavbar />

      {/* SVG Deckled Edge Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter
            id="figma-texture-contact"
            x="-10%"
            y="-15%"
            width="120%"
            height="130%"
            filterUnits="objectBoundingBox"
            primitiveUnits="userSpaceOnUse"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.25"
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto py-10 sm:py-14 md:py-16 pb-16 sm:pb-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16">
        {/* Header Block: Exact landing page title scale & typography */}
        <div className="mb-10 sm:mb-14 select-none">
          <h1 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] select-none">
            <span className="block">CONTACT</span>
            <span className="block">SUPPORT.</span>
          </h1>
          <p className="text-white/80 font-medium text-sm sm:text-base md:text-lg mt-3 max-w-xl">
            Have questions about the industrial curriculum, enterprise access, or billing? Reach out to our engineering support desk.
          </p>
        </div>

        {/* Content Grid: Contact Details (Left) + Inquiry Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-start">
          {/* Left Column: Contact Channels in Deckled Cards */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card: Direct Email */}
            <div className="relative w-full p-6 sm:p-7 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)]">
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx="5.1"
                    ry="5.1"
                    fill="white"
                    filter="url(#figma-texture-contact)"
                  />
                </svg>
              </div>

              <div className="relative z-10 flex items-start gap-4 text-neutral-900">
                <div className="w-10 h-10 rounded-full bg-[#0033FF] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Direct Support Email
                  </div>
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="text-base sm:text-lg font-bold text-[#0033FF] hover:underline mt-0.5 block"
                  >
                    {siteConfig.supportEmail}
                  </a>
                  <p className="text-xs text-neutral-600 mt-1">
                    Typical response time: Within 24 business hours
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Support Desk Hours */}
            <div className="relative w-full p-6 sm:p-7 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)]">
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx="5.1"
                    ry="5.1"
                    fill="white"
                    filter="url(#figma-texture-contact)"
                  />
                </svg>
              </div>

              <div className="relative z-10 flex items-start gap-4 text-neutral-900">
                <div className="w-10 h-10 rounded-full bg-[#0033FF] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Support Desk Hours
                  </div>
                  <div className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                    {siteConfig.contact.hours}
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">
                    Closed on Sundays and national public holidays
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Registered Office & Telephone */}
            <div className="relative w-full p-6 sm:p-7 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)]">
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx="5.1"
                    ry="5.1"
                    fill="white"
                    filter="url(#figma-texture-contact)"
                  />
                </svg>
              </div>

              <div className="relative z-10 space-y-4 text-neutral-900">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0033FF] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Registered Office
                    </div>
                    <div className="text-sm font-bold text-neutral-900 mt-0.5 leading-snug">
                      {siteConfig.contact.address}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 pt-2">
                  <div className="w-10 h-10 rounded-full bg-[#0033FF] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Phone Inquiries
                    </div>
                    <div className="text-sm sm:text-base font-bold text-neutral-900 font-mono mt-0.5">
                      {siteConfig.contact.phone}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Message Form in Deckled Card */}
          <div className="lg:col-span-7">
            <div className="relative w-full p-7 sm:p-9 md:p-10 select-none drop-shadow-[0_20px_35px_rgba(0,0,60,0.35)]">
              {/* Textured White Card Background via SVG Filter */}
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx="5.1"
                    ry="5.1"
                    fill="white"
                    filter="url(#figma-texture-contact)"
                  />
                </svg>
              </div>

              <div className="relative z-10 w-full text-neutral-900 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0033FF] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                      Send an Inquiry
                    </h2>
                    <p className="text-xs text-neutral-500 font-medium">
                      Fill out the details below and we will respond via email.
                    </p>
                  </div>
                </div>

                {isSent ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full inline-flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">
                      Inquiry Submitted Successfully
                    </h3>
                    <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                      Thank you for reaching out. A confirmation ticket has been logged and our engineering team will get back to you within 24 business hours.
                    </p>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSent(false);
                          setName('');
                          setEmail('');
                          setSubject('');
                          setMessage('');
                        }}
                        className="inline-flex items-center justify-center h-11 px-6 bg-[#0033FF] hover:bg-[#0028D6] text-white font-bold text-xs uppercase tracking-wider rounded-md sm:rounded-lg shadow-md transition-all gap-2"
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
                      <div className="p-4 border border-rose-300 bg-rose-50 text-rose-950 text-xs font-bold rounded-md flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                          Your Full Name <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                          Email Address <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="engineer@plant.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                        Subject / Topic <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Corporate enrollment for 10 engineers"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full h-11 sm:h-12 px-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-1.5">
                        Inquiry Details <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Please describe your question or requirements in detail..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-3.5 bg-neutral-50 border border-neutral-300 focus:border-[#0033FF] rounded-md sm:rounded-lg text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0033FF]/20 transition-all placeholder:text-neutral-400 resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-[#0033FF] hover:bg-[#0028D6] active:bg-[#0020b8] text-white font-bold text-sm uppercase tracking-wider rounded-md sm:rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
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
        </div>
      </main>

      {/* Signature Landing Footer */}
      <LandingFooter showQuickLinks={true} />
    </div>
  );
}
