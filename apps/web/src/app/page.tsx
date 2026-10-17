import React from 'react';
import Link from 'next/link';
import { siteConfig } from '../config/site';
import { CourseSyllabusSection } from '../components/CourseSyllabusSection';
import { HeroPreviewButton } from '../components/HeroPreviewButton';
import { Accordion, Badge, Card } from '../components/ui';
import {
  CheckCircle2,
  ShieldCheck,
  Award,
  Video,
  FileText,
  Clock,
  HelpCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

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

  const title = course?.title || 'Industrial Hydraulic Systems & Circuit Design';
  const priceFormatted = course?.pricePaise
    ? `₹${(course.pricePaise / 100).toLocaleString('en-IN')}`
    : '₹4,999';
  const originalPriceFormatted = course?.compareAtPricePaise
    ? `₹${(course.compareAtPricePaise / 100).toLocaleString('en-IN')}`
    : '₹9,999';
  const sections = course?.sections || [];
  const totalLessons = course?.totalLessons || 4;

  // Find first free preview lesson for hero button
  let firstPreviewLesson = {
    id: '01a13c1f-b379-7851-9c08-3d938832bd39',
    title: 'Lesson 1.1: Welcome & Course Overview',
  };
  for (const s of sections) {
    const preview = s.lessons.find((l: { isFreePreview: boolean }) => l.isFreePreview);
    if (preview) {
      firstPreviewLesson = preview;
      break;
    }
  }

  // Course JSON-LD Schema
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

  const faqItems = [
    {
      id: 'faq-1',
      title: 'Who is this course designed for?',
      content: (
        <p className="text-sm text-course-darkBlue leading-relaxed">
          This course is specifically built for mechanical engineers, maintenance managers, plant
          technicians, diploma holders, and automation engineers working with or operating
          industrial hydraulic machinery (presses, injection molding, CNC power packs, and mobile
          equipment).
        </p>
      ),
    },
    {
      id: 'faq-2',
      title: 'How long do I get access to the course content?',
      content: (
        <p className="text-sm text-course-darkBlue leading-relaxed">
          Your enrollment gives you 1 full year (365 days) of continuous, on-demand streaming access
          to all video lessons, circuit schematics, calculation templates, and future course
          updates. Optional renewal discounts are provided at the end of the year.
        </p>
      ),
    },
    {
      id: 'faq-3',
      title: 'Can I watch on my mobile phone?',
      content: (
        <p className="text-sm text-course-darkBlue leading-relaxed">
          Yes. The learning player uses optimized HLS video streaming designed to work seamlessly on
          4G/5G mobile connections, tablets, and desktop computers. You can pause on mobile and
          resume on your computer.
        </p>
      ),
    },
    {
      id: 'faq-4',
      title: 'Do I get a GST invoice for company reimbursement?',
      content: (
        <p className="text-sm text-course-darkBlue leading-relaxed">
          Yes! Immediately after your payment completes, a compliant GST tax invoice PDF is
          generated with your company details, order ID, and transaction breakdown. You can download
          it directly from your account dashboard.
        </p>
      ),
    },
    {
      id: 'faq-5',
      title: 'What if another device logs into my account?',
      content: (
        <p className="text-sm text-course-darkBlue leading-relaxed">
          For security and anti-piracy protection, single-student concurrent streaming is enforced.
          If you start watching on another device, you will simply receive a clear prompt and can
          resume playback with one click.
        </p>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />

      {/* Hero Section */}
      <section className="border-b border-black py-16 md:py-24 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-black px-3 py-1 text-xs font-bold uppercase tracking-wider mb-6 bg-course-orangeSubtle text-course-darkBlue">
              <span className="w-2.5 h-2.5 bg-course-orange inline-block border border-black"></span>
              Industrial Hydraulic Masterclass
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-course-darkBlue leading-tight mb-6">
              Practical Hydraulic Engineering &amp; Circuit Design
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-course-navyMuted mb-8 leading-relaxed font-normal">
              Industrial, blueprint-accurate hydraulic engineering taught by a veteran plant
              engineer with 20+ years of field experience. Master pump selection, proportional
              valves, troubleshooting, and schematic reading without academic fluff.
            </p>

            {/* Pricing badge */}
            <div className="flex items-center gap-4 mb-8">
              <span className="text-3xl md:text-4xl font-black text-course-darkBlue">
                {priceFormatted}
              </span>
              <span className="text-lg text-course-navyMuted line-through font-mono">
                {originalPriceFormatted}
              </span>
              <Badge variant="orange">Standard 1-Year Access</Badge>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/checkout"
                className="btn-primary text-xs md:text-sm uppercase tracking-wide px-8 py-3.5"
              >
                Enroll Now • Instant Access
              </Link>
              <HeroPreviewButton
                courseSlug="hydraulic-engineering-mastery"
                previewLessonId={firstPreviewLesson.id}
                previewLessonTitle={firstPreviewLesson.title}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Metric Bar */}
      <section className="border-b border-black bg-course-white py-6">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="border border-black p-4 bg-course-white">
            <div className="text-2xl md:text-3xl font-black text-course-darkBlue">20+ Years</div>
            <div className="text-xs uppercase font-bold text-course-navyMuted mt-1">
              Field Plant Experience
            </div>
          </div>
          <div className="border border-black p-4 bg-course-white">
            <div className="text-2xl md:text-3xl font-black text-course-darkBlue">70,000+</div>
            <div className="text-xs uppercase font-bold text-course-navyMuted mt-1">
              YouTube Engineers
            </div>
          </div>
          <div className="border border-black p-4 bg-course-white">
            <div className="text-2xl md:text-3xl font-black text-course-darkBlue">
              {totalLessons}+
            </div>
            <div className="text-xs uppercase font-bold text-course-navyMuted mt-1">
              Practical Lessons
            </div>
          </div>
          <div className="border border-black p-4 bg-course-white">
            <div className="text-2xl md:text-3xl font-black text-course-darkBlue">Direct HLS</div>
            <div className="text-xs uppercase font-bold text-course-navyMuted mt-1">
              Secure HD Streaming
            </div>
          </div>
        </div>
      </section>

      {/* Who It Is For vs Who It Is NOT For */}
      <section className="border-b border-black py-16 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl mb-12">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-2">
              Honest Engineering Expectations
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-course-darkBlue tracking-tight">
              Is This Course Right For You?
            </h2>
            <p className="text-sm md:text-base text-course-navyMuted mt-2">
              We teach practical industrial hydraulic engineering. No generic textbook formulas or
              superficial animations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Who it's for */}
            <div className="border-2 border-black p-6 md:p-8 bg-course-white">
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-6 h-6 text-course-orange shrink-0" />
                <h3 className="text-lg md:text-xl font-black text-course-darkBlue uppercase tracking-tight">
                  Who This Course Is For
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-course-darkBlue">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-course-orange inline-block border border-black mt-1.5 shrink-0" />
                  <span>
                    <strong>Plant Maintenance Engineers:</strong> Diagnosing real-time pressure
                    drops, overheating, and oil contamination in plant machinery.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-course-orange inline-block border border-black mt-1.5 shrink-0" />
                  <span>
                    <strong>Design &amp; Application Engineers:</strong> Sizing cylinders, selecting
                    proportional directional valves, and specifying hydraulic power units (HPUs).
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-course-orange inline-block border border-black mt-1.5 shrink-0" />
                  <span>
                    <strong>Technicians &amp; Diploma Holders:</strong> Looking to read complex
                    DIN/ISO hydraulic schematics with confidence.
                  </span>
                </li>
              </ul>
            </div>

            {/* Who it is NOT for */}
            <div className="border-2 border-black p-6 md:p-8 bg-course-white">
              <div className="flex items-center gap-2 mb-6">
                <XCircle className="w-6 h-6 text-course-navyMuted shrink-0" />
                <h3 className="text-lg md:text-xl font-black text-course-darkBlue uppercase tracking-tight">
                  Who This Course Is NOT For
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-course-navyMuted">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gray-400 inline-block border border-black mt-1.5 shrink-0" />
                  <span>
                    <strong>Pure Academics:</strong> Seeking differential equations and theoretical
                    fluid dynamics for college exams.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gray-400 inline-block border border-black mt-1.5 shrink-0" />
                  <span>
                    <strong>Quick Hacks:</strong> Looking for shortcuts rather than blueprint
                    standards, filtration rules, and physical safety protocols.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gray-400 inline-block border border-black mt-1.5 shrink-0" />
                  <span>
                    <strong>Hobbyists:</strong> Without any industrial equipment or mechanical
                    engineering background.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Learn Grid */}
      <section className="border-b border-black py-16 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-2">
              Practical Core Competencies
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-course-darkBlue tracking-tight">
              What You Will Master
            </h2>
            <p className="text-sm md:text-base text-course-navyMuted mt-2">
              Concrete skills you can deploy immediately on your plant floor or design workstation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default">
              <div className="text-xs font-mono font-bold text-course-darkBlue uppercase mb-2">
                01
              </div>
              <h3 className="text-base font-bold text-course-darkBlue mb-2">
                Hydraulic Power Units &amp; Pumps
              </h3>
              <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
                Vane, gear, and axial piston pumps. Displacement calculations, volumetric
                efficiency, swashplate controls, and cavitation prevention.
              </p>
            </Card>

            <Card variant="default">
              <div className="text-xs font-mono font-bold text-course-darkBlue uppercase mb-2">
                02
              </div>
              <h3 className="text-base font-bold text-course-darkBlue mb-2">
                Proportional &amp; Directional Valves
              </h3>
              <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
                Spool configurations, pilot-operated check valves, pressure relief, reducing, and
                electronic amplifier card tuning.
              </p>
            </Card>

            <Card variant="default">
              <div className="text-xs font-mono font-bold text-course-darkBlue uppercase mb-2">
                03
              </div>
              <h3 className="text-base font-bold text-course-darkBlue mb-2">
                Systematic Plant Troubleshooting
              </h3>
              <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
                Step-by-step diagnostic workflows for pressure loss, erratic cylinder movement,
                excessive oil heat, and contamination breakdown.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Syllabus Accordion Section */}
      <section id="syllabus" className="border-b border-black py-16 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-2">
                Course Curriculum
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-course-darkBlue tracking-tight">
                Complete Syllabus &amp; Video Lessons
              </h2>
              <p className="text-sm md:text-base text-course-navyMuted mt-2">
                Click any lesson marked with &quot;Free Preview&quot; to test watch directly.
              </p>
            </div>
            <div className="text-xs font-mono text-course-navySubtle">
              {sections.length} Modules • {totalLessons} Lessons
            </div>
          </div>

          <CourseSyllabusSection courseSlug="hydraulic-engineering-mastery" sections={sections} />
        </div>
      </section>

      {/* Instructor Bio Section */}
      <section id="instructor" className="border-b border-black py-16 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="border-2 border-black p-8 md:p-12 bg-course-white">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-course-darkBlue text-course-white flex items-center justify-center font-black text-3xl md:text-4xl border border-black shrink-0">
                {siteConfig.logo.shortWordmark}
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-black text-course-darkBlue tracking-tight">
                    {siteConfig.instructor.name}
                  </h2>
                  <Badge variant="orange">{siteConfig.instructor.subscribers}</Badge>
                </div>

                <div className="text-sm font-bold text-course-darkBlue uppercase tracking-wide">
                  {siteConfig.instructor.credentials}
                </div>

                <p className="text-sm md:text-base text-course-darkBlue leading-relaxed">
                  {siteConfig.instructor.bio}
                </p>

                <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
                  Focused on practical schematic clarity, hydraulic system diagnostics, and
                  preventing costly plant downtime based on hands-on industrial field experience.
                </p>

                <div className="pt-2">
                  <a
                    href={siteConfig.instructor.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline inline-flex items-center gap-2 text-xs"
                  >
                    <span>View YouTube Channel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="border-b border-black py-16 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-2">
              Enrollment Package
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-course-darkBlue tracking-tight">
              What Is Included In Your Registration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="border border-black p-6 bg-course-white">
              <Clock className="w-6 h-6 text-course-orange mb-4" />
              <h3 className="font-bold text-base text-course-darkBlue mb-2">
                1 Year On-Demand Access
              </h3>
              <p className="text-xs text-course-navyMuted leading-relaxed">
                365 days of unlimited access from any mobile phone, tablet, or desktop computer.
              </p>
            </div>

            <div className="border border-black p-6 bg-course-white">
              <Video className="w-6 h-6 text-course-orange mb-4" />
              <h3 className="font-bold text-base text-course-darkBlue mb-2">
                Secure HLS Streaming
              </h3>
              <p className="text-xs text-course-navyMuted leading-relaxed">
                Adaptive bitrate video with watermarked anti-piracy protection and multi-speed
                controls.
              </p>
            </div>

            <div className="border border-black p-6 bg-course-white">
              <FileText className="w-6 h-6 text-course-orange mb-4" />
              <h3 className="font-bold text-base text-course-darkBlue mb-2">
                Instant GST Invoicing
              </h3>
              <p className="text-xs text-course-navyMuted leading-relaxed">
                Direct tax invoice generated upon successful checkout for company reimbursement.
              </p>
            </div>

            <div className="border border-black p-6 bg-course-white">
              <Award className="w-6 h-6 text-course-orange mb-4" />
              <h3 className="font-bold text-base text-course-darkBlue mb-2">
                Completion Verification
              </h3>
              <p className="text-xs text-course-navyMuted leading-relaxed">
                Official certificate verifying your practical hydraulic system engineering
                competencies.
              </p>
            </div>

            <div className="border border-black p-6 bg-course-white">
              <HelpCircle className="w-6 h-6 text-course-orange mb-4" />
              <h3 className="font-bold text-base text-course-darkBlue mb-2">
                Direct Q&amp;A Clarifications
              </h3>
              <p className="text-xs text-course-navyMuted leading-relaxed">
                Ask specific questions about circuit diagrams and real-world plant scenarios.
              </p>
            </div>

            <div className="border border-black p-6 bg-course-white">
              <ShieldCheck className="w-6 h-6 text-course-orange mb-4" />
              <h3 className="font-bold text-base text-course-darkBlue mb-2">
                Future Module Updates
              </h3>
              <p className="text-xs text-course-navyMuted leading-relaxed">
                All supplementary case studies and circuit diagrams added within your validity
                window.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-b border-black py-16 bg-course-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-2">
              Frequently Asked Questions
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-course-darkBlue tracking-tight">
              Got Questions? Honest Answers.
            </h2>
          </div>

          <Accordion items={faqItems} defaultOpenIds={['faq-1', 'faq-2']} />
        </div>
      </section>

      {/* Pricing / Final Call to Action */}
      <section id="pricing" className="py-20 bg-course-white">
        <div className="max-w-4xl mx-auto px-4">
          <Card variant="default" padding="lg" className="border-2 text-center">
            <span className="inline-block border border-black px-3 py-1 text-xs font-black uppercase bg-course-orange text-course-darkBlue mb-6">
              Instant Online Registration
            </span>

            <h2 className="text-3xl md:text-4xl font-black text-course-darkBlue mb-4 tracking-tight">
              Start Mastering Industrial Hydraulics Today
            </h2>

            <p className="text-sm md:text-base text-course-navyMuted max-w-xl mx-auto mb-8 leading-relaxed">
              Master practical, blueprint-accurate field engineering and industrial circuit design.
              Instant access upon enrollment with UPI, Credit/Debit cards, or Netbanking.
            </p>

            <div className="border border-black p-6 bg-course-orangeSubtle max-w-md mx-auto mb-8">
              <div className="text-4xl md:text-5xl font-black text-course-darkBlue">
                {priceFormatted}
              </div>
              <div className="text-xs text-course-darkBlue font-bold uppercase tracking-wider mt-2">
                1 Year Complete Access • GST Inclusive • Direct Invoicing
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/checkout"
                className="btn-primary w-full sm:w-auto uppercase tracking-wide px-10 py-4 text-sm font-black"
              >
                Proceed to Secure Checkout
              </Link>
              <HeroPreviewButton
                courseSlug="hydraulic-engineering-mastery"
                previewLessonId={firstPreviewLesson.id}
                previewLessonTitle={firstPreviewLesson.title}
              />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
