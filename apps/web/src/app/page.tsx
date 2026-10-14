import Link from 'next/link';
import { CheckCircle2, PlayCircle, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="border-b border-black py-16 md:py-24 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-black px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-6 bg-course-orangeSubtle text-course-darkBlue">
              <span className="w-2 h-2 bg-course-orange inline-block"></span>
              Industrial Hydraulic Masterclass
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-course-darkBlue leading-tight mb-6">
              Practical Hydraulic Engineering & Circuit Design
            </h1>
            <p className="text-lg md:text-xl text-course-navyMuted mb-8 leading-relaxed">
              Step-by-step industrial training taught by a veteran hydraulic engineer with 20+ years
              of plant experience. Master pump selection, proportional valves, schematic reading,
              and live troubleshooting.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="#pricing" className="btn-primary text-sm uppercase tracking-wide">
                Get Instant Access
              </Link>
              <Link
                href="#syllabus"
                className="btn-outline text-sm uppercase tracking-wide flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-course-orange" />
                Watch Free Preview
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Course Highlights Bar */}
      <section className="border-b border-black bg-course-white py-6">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="border border-black p-4">
            <div className="text-2xl font-extrabold text-course-darkBlue">60+</div>
            <div className="text-xs uppercase font-medium text-course-navyMuted">
              In-Depth Lessons
            </div>
          </div>
          <div className="border border-black p-4">
            <div className="text-2xl font-extrabold text-course-darkBlue">20+ Years</div>
            <div className="text-xs uppercase font-medium text-course-navyMuted">
              Industry Field Experience
            </div>
          </div>
          <div className="border border-black p-4">
            <div className="text-2xl font-extrabold text-course-darkBlue">1 Year / Lifetime</div>
            <div className="text-xs uppercase font-medium text-course-navyMuted">
              Flexible Online Access
            </div>
          </div>
          <div className="border border-black p-4">
            <div className="text-2xl font-extrabold text-course-darkBlue">100% Verified</div>
            <div className="text-xs uppercase font-medium text-course-navyMuted">
              Direct Streaming Delivery
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section id="syllabus" className="border-b border-black py-16 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-course-darkBlue mb-4">
            Course Curriculum & Syllabus
          </h2>
          <p className="text-course-navyMuted mb-8 max-w-2xl">
            Structured modular lessons taking you from fundamental fluid mechanics to advanced
            industrial circuit analysis.
          </p>

          <div className="space-y-4">
            <div className="border border-black p-6 bg-course-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-course-orange uppercase tracking-wider">
                    Module 1
                  </span>
                  <h3 className="text-lg font-bold text-course-darkBlue mt-1">
                    Fundamentals & Physical Laws
                  </h3>
                  <p className="text-sm text-course-navyMuted mt-1">
                    Pascal’s principle, flow velocity, pressure drops, and oil viscosity standards.
                  </p>
                </div>
                <span className="border border-black px-3 py-1 text-xs font-semibold bg-course-orangeSubtle">
                  Free Preview
                </span>
              </div>
            </div>

            <div className="border border-black p-6 bg-course-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-course-orange uppercase tracking-wider">
                    Module 2
                  </span>
                  <h3 className="text-lg font-bold text-course-darkBlue mt-1">
                    Pumps, Actuators & Directional Valves
                  </h3>
                  <p className="text-sm text-course-navyMuted mt-1">
                    Gear, vane, and axial piston pump internals, cylinder sizing, and spool valve
                    configurations.
                  </p>
                </div>
                <span className="text-xs text-course-navyMuted font-medium">Paid Access</span>
              </div>
            </div>

            <div className="border border-black p-6 bg-course-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-course-orange uppercase tracking-wider">
                    Module 3
                  </span>
                  <h3 className="text-lg font-bold text-course-darkBlue mt-1">
                    Hydraulic Circuit Diagnostics & Troubleshooting
                  </h3>
                  <p className="text-sm text-course-navyMuted mt-1">
                    Overheating, cavitation, contamination control, and systematic fault isolation
                    in live plants.
                  </p>
                </div>
                <span className="text-xs text-course-navyMuted font-medium">Paid Access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Enrollment CTA */}
      <section id="pricing" className="py-16 bg-course-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-xl mx-auto border border-black p-8 text-center bg-course-white">
            <span className="inline-block border border-black px-3 py-1 text-xs font-semibold bg-course-orange text-course-white mb-4">
              Instant Online Access
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-course-darkBlue mb-2">
              Complete Course Enrollment
            </h2>
            <p className="text-sm text-course-navyMuted mb-6">
              Full access to all 60+ video lessons, updates, and direct instructor Q&A access.
            </p>

            <div className="text-4xl font-extrabold text-course-darkBlue mb-2">₹4,999</div>
            <div className="text-xs text-course-navyMuted mb-6">
              Inclusive of all applicable taxes • 1 Year Access
            </div>

            <div className="space-y-3 text-left mb-8 max-w-sm mx-auto text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-course-orange shrink-0" />
                <span>Unlimited streaming on any device</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-course-orange shrink-0" />
                <span>Watermarked high-definition HLS playback</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-course-orange shrink-0" />
                <span>Instant activation via UPI, Cards, Netbanking</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-course-orange shrink-0" />
                <span>Direct GST invoice generated upon payment</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="btn-primary block w-full uppercase tracking-wider text-sm py-3"
            >
              Proceed to Secure Checkout
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
