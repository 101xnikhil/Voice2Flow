import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helper,
      leftIcon,
      rightIcon,
      type = 'text',
      isPassword = false,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--text)] select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[var(--text-muted)] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full rounded-lg bg-[var(--surface)] text-[var(--text)] border text-sm px-3.5 py-2 transition-all duration-150',
                'placeholder:text-[var(--text-muted)] placeholder:opacity-70',
                'focus:outline-none focus:ring-2 focus:ring-[#7C5CFF] focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error ? 'border-[#DC2626] focus:ring-[#DC2626]' : 'border-[var(--border)]',
                leftIcon ? 'pl-9' : '',
                (isPassword || rightIcon) ? 'pr-10' : '',
                className
              )
            )}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute right-3 text-[var(--text-muted)] pointer-events-none flex items-center">
                {rightIcon}
              </div>
            )
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#DC2626] font-medium mt-0.5">{error}</p>
        ) : helper ? (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{helper}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
