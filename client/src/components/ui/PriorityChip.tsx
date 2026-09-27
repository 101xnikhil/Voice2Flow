import React from 'react';
import { TaskPriority } from '@voice2flow/shared';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PriorityChipProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
  className?: string;
}

const priorityStyles: Record<
  TaskPriority,
  { bg: string; text: string; border: string; label: string; dot: string }
> = {
  LOW: {
    bg: 'bg-slate-500/10 dark:bg-slate-400/10',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
    label: 'Low',
  },
  MEDIUM: {
    bg: 'bg-blue-500/10 dark:bg-blue-400/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
    label: 'Medium',
  },
  HIGH: {
    bg: 'bg-orange-500/10 dark:bg-orange-400/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500',
    label: 'High',
  },
  URGENT: {
    bg: 'bg-red-500/15 dark:bg-red-500/20',
    text: 'text-red-600 dark:text-red-400 font-semibold',
    border: 'border-red-500/30',
    dot: 'bg-red-500 animate-pulse',
    label: 'Urgent',
  },
};

export const PriorityChip: React.FC<PriorityChipProps> = ({
  priority,
  size = 'md',
  className,
}) => {
  const config = priorityStyles[priority] || priorityStyles.MEDIUM;

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border transition-colors select-none font-medium',
          config.bg,
          config.text,
          config.border,
          size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5',
          className
        )
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  );
};
