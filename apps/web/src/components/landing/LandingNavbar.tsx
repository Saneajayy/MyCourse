'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Syllabus', href: '/#syllabus' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'Instructor', href: '/#instructor' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQs', href: '/#faqs' },
];

export function LandingNavbar() {
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full figma-glass-nav font-reddit select-none">
      <nav
        aria-label="Main Navigation"
        className="w-full h-20 md:h-[84px] flex items-stretch justify-between"
      >
        {/* Left Side: Brand Logo + Nav Links (shifted to right) */}
        <div className="flex items-center pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 gap-6 sm:gap-8 lg:gap-12">
          {/* Logo: Two lines stacked, ExtraBold weight (800 - one step down from black), Reddit Sans */}
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

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-white/90 hover:text-white font-semibold text-[16px] xl:text-[17px] tracking-normal transition-colors py-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Side: Action Cells with Full-Height Vertical Dividers */}
        <div className="flex items-stretch">
          {/* Buy Now Cell (visible on medium & desktop screens) */}
          <Link
            href="/#pricing"
            className="figma-glass-divider h-full flex items-center justify-center px-6 sm:px-8 lg:px-10 text-white font-semibold text-[15px] sm:text-[16px] xl:text-[17px] tracking-normal hover:bg-white/10 active:bg-white/15 transition-all text-center"
          >
            Buy Now
          </Link>

          {/* Log In / Account Cell */}
          <div className="figma-glass-divider border-r border-white/20 h-full flex items-stretch">
            {isAuthenticated ? (
              <Link
                href="/my-courses"
                className="h-full flex items-center justify-center px-6 sm:px-8 lg:px-10 text-white font-semibold text-[15px] sm:text-[16px] xl:text-[17px] tracking-normal hover:bg-white/10 active:bg-white/15 transition-all"
              >
                My Courses
              </Link>
            ) : (
              <Link
                href="/login"
                className="h-full flex items-center justify-center px-6 sm:px-8 lg:px-10 text-white font-semibold text-[15px] sm:text-[16px] xl:text-[17px] tracking-normal hover:bg-white/10 active:bg-white/15 transition-all whitespace-nowrap"
              >
                Log In
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle Button with Smooth Icon Morph */}
          <div className="lg:hidden figma-glass-divider h-full flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={isMobileMenuOpen}
              className="h-full px-4 sm:px-5 relative flex items-center justify-center text-white hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
            >
              <Menu
                className={`w-5 h-5 absolute transition-all duration-300 ease-in-out ${
                  isMobileMenuOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                className={`w-5 h-5 absolute transition-all duration-300 ease-in-out ${
                  isMobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown (Frosted Glass, Expands & Collapses Smoothly On Top) */}
      <div
        className={`lg:hidden figma-glass-nav border-t border-white/15 transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto visible'
            : 'opacity-0 pointer-events-none invisible border-t-transparent'
        }`}
      >
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            isMobileMenuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-6 py-5 flex flex-col space-y-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white/90 hover:text-white font-semibold text-base py-1 border-b border-white/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/#pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center font-semibold text-white bg-white/15 hover:bg-white/25 rounded-md border border-white/20 transition-all text-sm"
                >
                  Buy Now
                </Link>
                {isAuthenticated ? (
                  <Link
                    href="/my-courses"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center font-semibold text-white bg-white/10 hover:bg-white/20 rounded-md border border-white/15 transition-all text-sm"
                  >
                    My Courses
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center font-semibold text-white bg-white/10 hover:bg-white/20 rounded-md border border-white/15 transition-all text-sm"
                  >
                    Log In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
