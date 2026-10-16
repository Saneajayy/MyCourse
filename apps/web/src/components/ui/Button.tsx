import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'dark' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold tracking-wide uppercase transition-colors select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] text-xs md:text-sm';

    const variantStyles = {
      primary:
        'bg-course-orange text-course-darkBlue font-black border border-black hover:bg-course-orangeHover active:bg-course-orangeHover',
      outline:
        'bg-course-white text-course-darkBlue border border-black hover:bg-course-orangeSubtle active:bg-course-orangeSubtle',
      dark: 'bg-course-darkBlue text-course-white border border-black hover:bg-course-navyMuted active:bg-course-navyMuted',
      ghost:
        'bg-transparent text-course-darkBlue hover:bg-course-orangeSubtle active:bg-course-orangeSubtle',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-5 py-2.5',
      lg: 'px-6 py-3.5 text-sm md:text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
