'use client';

import React, { useRef, useCallback } from 'react';

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  perspective?: number;
}

export function TiltCard({
  children,
  className = '',
  maxTilt = 6.5,
  scale = 1.015,
  perspective = 1000,
  style,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.15s ease-out';
      }
      onMouseEnter?.(e);
    },
    [onMouseEnter],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const rotateX = (-y * maxTilt * 2).toFixed(2);
      const rotateY = (x * maxTilt * 2).toFixed(2);

      cardRef.current.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      onMouseMove?.(e);
    },
    [maxTilt, scale, perspective, onMouseMove],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      cardRef.current.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
      cardRef.current.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      onMouseLeave?.(e);
    },
    [perspective, onMouseLeave],
  );

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
