import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hydraulic Engineering Masterclass | Practical Industrial Hydraulics',
  description:
    'Master industrial hydraulic systems, circuit design, and troubleshooting directly from an engineer with 20+ years of field experience.',
  openGraph: {
    title: 'Hydraulic Engineering Masterclass',
    description:
      'Master industrial hydraulic systems, circuit design, and troubleshooting directly from an engineer with 20+ years of field experience.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-course-white text-course-darkBlue">
        <header className="border-b border-black bg-course-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="font-bold text-lg tracking-tight text-course-darkBlue flex items-center gap-2"
            >
              <span className="w-3 h-3 bg-course-orange inline-block border border-black"></span>
              Hydraulic Engineering Academy
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link href="/syllabus" className="hover:text-course-orange transition-colors">
                Syllabus
              </Link>
              <Link href="/about" className="hover:text-course-orange transition-colors">
                Instructor
              </Link>
              <Link href="/login" className="btn-outline text-xs">
                Log In
              </Link>
              <Link href="/#pricing" className="btn-primary text-xs">
                Enroll Now
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-black bg-course-white py-8 text-xs text-course-navyMuted">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Hydraulic Engineering Academy. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:underline">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
              <Link href="/refunds" className="hover:underline">
                Refund Policy
              </Link>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
