'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';
import { siteConfig } from '../config/site';
import { Menu, X, User as UserIcon, BookOpen, LogOut } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-black bg-course-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo / Brand Name */}
        <Link
          href="/"
          className="font-black text-base md:text-lg tracking-tight text-course-darkBlue flex items-center gap-2 select-none"
        >
          <span className="w-3.5 h-3.5 bg-course-orange inline-block border border-black shrink-0" />
          <span>{siteConfig.brandName}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-bold tracking-wide">
          <Link
            href="/#syllabus"
            className="text-course-darkBlue hover:text-course-orange transition-colors min-h-[44px] inline-flex items-center"
          >
            Syllabus
          </Link>
          <Link
            href="/#instructor"
            className="text-course-darkBlue hover:text-course-orange transition-colors min-h-[44px] inline-flex items-center"
          >
            Instructor
          </Link>
          <Link
            href="/#faq"
            className="text-course-darkBlue hover:text-course-orange transition-colors min-h-[44px] inline-flex items-center"
          >
            FAQ
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/my-courses" className="btn-outline text-xs flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                My Courses
              </Link>
              <Link href="/account" className="btn-outline text-xs flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                Account
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                aria-label="Log out"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-black hover:bg-course-orangeSubtle text-course-darkBlue"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="btn-outline text-xs">
                Log In
              </Link>
              <Link href="/#pricing" className="btn-primary text-xs">
                Enroll Now
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-black text-course-darkBlue"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-black bg-course-white px-4 py-6 space-y-4">
          <div className="flex flex-col space-y-3 font-bold text-sm">
            <Link
              href="/#syllabus"
              onClick={() => setIsMobileMenuOpen(false)}
              className="min-h-[44px] flex items-center border-b border-black/10 text-course-darkBlue"
            >
              Syllabus
            </Link>
            <Link
              href="/#instructor"
              onClick={() => setIsMobileMenuOpen(false)}
              className="min-h-[44px] flex items-center border-b border-black/10 text-course-darkBlue"
            >
              Instructor Bio
            </Link>
            <Link
              href="/#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="min-h-[44px] flex items-center border-b border-black/10 text-course-darkBlue"
            >
              FAQ
            </Link>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/my-courses"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-outline text-center text-xs"
                >
                  My Courses
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-outline text-center text-xs"
                >
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="btn-dark text-center text-xs"
                >
                  Log Out ({user?.name || user?.email})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-outline text-center text-xs"
                >
                  Log In
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-primary text-center text-xs"
                >
                  Enroll Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
