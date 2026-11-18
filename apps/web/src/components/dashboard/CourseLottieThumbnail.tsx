'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CourseLottieThumbnailProps {
  className?: string;
  fallbackSrc?: string;
}

export function CourseLottieThumbnail({
  className,
  fallbackSrc = '/course-halftone.jpg',
}: CourseLottieThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let anim: { destroy: () => void } | null = null;
    let isMounted = true;

    import('lottie-web')
      .then((lottieModule) => {
        if (!isMounted || !containerRef.current) return;
        const lottie = (lottieModule.default ||
          lottieModule) as typeof import('lottie-web').default;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/coursecarddd.json',
        });
      })
      .catch((err) => {
        console.error('Failed to load lottie animation:', err);
        if (isMounted) setHasError(true);
      });

    return () => {
      isMounted = false;
      if (anim) {
        anim.destroy();
      }
    };
  }, []);

  if (hasError) {
    return (
      <img
        src={fallbackSrc}
        alt="Course Thumbnail"
        className="w-full h-full object-cover select-none"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center select-none overflow-hidden [&_svg]:w-full [&_svg]:h-full [&_svg]:object-contain ${className || ''}`}
      aria-hidden="true"
    />
  );
}
