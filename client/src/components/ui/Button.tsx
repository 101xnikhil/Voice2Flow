import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7C5CFF] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] text-white shadow-sm hover:brightness-105 hover:shadow focus:ring-offset-[var(--bg)]',
      secondary:
        'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] border border-[var(--border)]',
      outline:
        'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] bg-transparent',
      ghost:
        'text-[var(--text)] hover:bg-[var(--surface-2)] bg-transparent',
      danger:
        'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm',
    };

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-3.5 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
