import React from 'react';
import { siteConfig } from '../config/site';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { SyllabusSection } from '../components/landing/SyllabusSection';
import { OutcomesSection } from '../components/landing/OutcomesSection';
import { CertificateSection } from '../components/landing/CertificateSection';
import { InstructorSection } from '../components/landing/InstructorSection';
import { ReviewsSection } from '../components/landing/ReviewsSection';
import { FaqSection } from '../components/landing/FaqSection';
import { PricingSection } from '../components/landing/PricingSection';
import { LandingFooter } from '../components/landing/LandingFooter';

// Fetch course data on server with ISR revalidation (5 minutes)
async function getCourseData() {
  try {
    const res = await fetch(`${siteConfig.urls.api}/api/v1/courses/hydraulic-engineering-mastery`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const course = await getCourseData();

  const title = course?.title || 'Hydraulic System Basics';
  const priceFormatted = course?.pricePaise
    ? `₹${(course.pricePaise / 100).toLocaleString('en-IN')}`
    : '₹4,999';
  const originalPriceFormatted = course?.compareAtPricePaise
    ? `₹${(course.compareAtPricePaise / 100).toLocaleString('en-IN')}`
    : '₹9,999';
  const sections = course?.sections || [];

  // Course JSON-LD Schema for SEO
  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description: siteConfig.description,
    provider: {
      '@type': 'Organization',
      name: siteConfig.brandName,
      sameAs: siteConfig.urls.app,
    },
    instructor: {
      '@type': 'Person',
      name: siteConfig.instructor.name,
      jobTitle: 'Lead Hydraulic Specialist',
    },
    offers: {
      '@type': 'Offer',
      price: '4999.00',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      validFrom: '2026-01-01',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT20H',
    },
  };

  return (
    <div className="bg-[#0033FF] min-h-screen text-white font-sans relative selection:bg-white selection:text-[#0033FF] overflow-x-hidden pt-20 md:pt-[84px]">
      {/* Background Noise Texture Overlay */}
      <div className="noise-texture" aria-hidden="true" />

      {/* Structured SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />

      {/* Floating Glass Navbar */}
      <LandingNavbar />

      {/* Hero Section matching the screenshot */}
      <HeroSection courseSlug="hydraulic-engineering-mastery" />

      {/* Course Syllabus & Overview Section */}
      <SyllabusSection
        courseSlug="hydraulic-engineering-mastery"
        sections={sections}
      />

      {/* Course Outcomes & Practical Skills */}
      <OutcomesSection />

      {/* Official Certificate of Completion */}
      <CertificateSection />

      {/* 23+ Years Field Experience Instructor Profile */}
      <InstructorSection />

      {/* Social Proof & Student Reviews Slider */}
      <ReviewsSection />

      {/* Pricing & Instant Enrollment */}
      <PricingSection
        priceFormatted={priceFormatted}
        originalPriceFormatted={originalPriceFormatted}
        courseSlug="hydraulic-engineering-mastery"
      />

      {/* Frequently Asked Questions */}
      <FaqSection />

      {/* Glassy Footer */}
      <LandingFooter />
    </div>
  );
}
