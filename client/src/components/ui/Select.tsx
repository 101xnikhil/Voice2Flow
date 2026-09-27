import React from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-[var(--text)] select-none">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full appearance-none rounded-lg bg-[var(--surface)] text-[var(--text)] border text-sm pl-3.5 pr-10 py-2 transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-[#7C5CFF] focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error ? 'border-[#DC2626] focus:ring-[#DC2626]' : 'border-[var(--border)]',
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--surface)] text-[var(--text)]">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-[#DC2626] font-medium mt-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
