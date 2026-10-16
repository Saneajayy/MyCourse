import React from 'react';
import Link from 'next/link';
import { Card } from '../components/ui';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-20 bg-course-white">
      <div className="w-full max-w-md">
        <Card variant="default" padding="lg" className="border-2 text-center">
          <div className="w-16 h-16 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black mb-4">
            <Compass className="w-8 h-8 text-course-orange" />
          </div>
          <div className="text-4xl font-black font-mono text-course-darkBlue mb-2">404</div>
          <h1 className="text-xl font-black text-course-darkBlue tracking-tight mb-2">
            Page Not Found
          </h1>
          <p className="text-xs text-course-navyMuted mb-6 leading-relaxed">
            The hydraulic schematic or learning page you requested does not exist or may have been
            relocated.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="btn-primary inline-flex items-center gap-2 text-xs uppercase tracking-wider py-3 px-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
