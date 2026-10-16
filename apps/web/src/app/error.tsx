'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Card, Button } from '../components/ui';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors
    console.error('Next.js Global Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-20 bg-course-white">
      <div className="w-full max-w-md">
        <Card variant="default" padding="lg" className="border-2 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-700 inline-flex items-center justify-center border-2 border-rose-800 mb-4">
            <AlertCircle className="w-8 h-8 text-rose-700" />
          </div>
          <h1 className="text-xl font-black text-course-darkBlue tracking-tight mb-2">
            System Operation Interrupted
          </h1>
          <p className="text-xs text-course-navyMuted mb-4 leading-relaxed">
            An unexpected error occurred while loading this page. Our technical monitoring team has
            been alerted.
          </p>

          {error.digest && (
            <div className="p-2 border border-black/20 bg-course-bg text-[11px] font-mono text-course-navySubtle mb-6">
              Digest: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => reset()}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              <span>Try Again</span>
            </Button>
            <Link href="/" className="btn-outline w-full sm:w-auto text-xs py-2.5">
              <Home className="w-4 h-4 mr-1.5" />
              <span>Back Home</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
