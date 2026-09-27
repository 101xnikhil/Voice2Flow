import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40',
          className
        )
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--text)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
