import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'orange' | 'orangeSubtle' | 'dark' | 'success' | 'error';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-course-white text-course-darkBlue border border-black',
    orange: 'bg-course-orange text-course-darkBlue border border-black font-black',
    orangeSubtle: 'bg-course-orangeSubtle text-course-darkBlue border border-black font-bold',
    dark: 'bg-course-darkBlue text-course-white border border-black font-bold',
    success: 'bg-emerald-50 text-emerald-950 border border-emerald-800 font-bold',
    error: 'bg-rose-50 text-rose-950 border border-rose-800 font-bold',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 tracking-wider uppercase',
    md: 'text-xs px-2.5 py-1 tracking-wider uppercase',
  };

  return (
    <span
      className={`inline-flex items-center justify-center select-none font-mono ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
