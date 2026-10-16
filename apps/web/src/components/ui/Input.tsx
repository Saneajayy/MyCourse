import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold uppercase tracking-wider text-course-darkBlue"
          >
            {label}
            {required && (
              <span className="text-course-error ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={errorId || helperId}
          className={`input-base ${error ? 'border-course-error focus:outline-course-error' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs font-medium text-course-error mt-0.5">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-xs text-course-navySubtle mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
