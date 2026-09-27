import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helper, id, disabled, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--text)] select-none">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          disabled={disabled}
          className={twMerge(
            clsx(
              'w-full rounded-lg bg-[var(--surface)] text-[var(--text)] border text-sm px-3.5 py-2.5 transition-all duration-150',
              'placeholder:text-[var(--text-muted)] placeholder:opacity-70 resize-y',
              'focus:outline-none focus:ring-2 focus:ring-[#7C5CFF] focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-[#DC2626] focus:ring-[#DC2626]' : 'border-[var(--border)]',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#DC2626] font-medium mt-0.5">{error}</p>
        ) : helper ? (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{helper}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
