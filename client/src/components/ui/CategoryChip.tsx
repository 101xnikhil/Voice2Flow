import React from 'react';
import { TaskCategory } from '@voice2flow/shared';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CategoryChipProps {
  category: TaskCategory;
  size?: 'sm' | 'md';
  className?: string;
}

const categoryStyles: Record<
  TaskCategory,
  { bg: string; text: string; border: string; label: string }
> = {
  ACADEMIC: {
    bg: 'bg-purple-500/10 dark:bg-purple-400/10',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/20',
    label: 'Academic',
  },
  PERSONAL: {
    bg: 'bg-teal-500/10 dark:bg-teal-400/10',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/20',
    label: 'Personal',
  },
  PROJECT: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-400/10',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/20',
    label: 'Project',
  },
  WORK: {
    bg: 'bg-amber-500/10 dark:bg-amber-400/10',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/20',
    label: 'Work',
  },
  OTHER: {
    bg: 'bg-slate-500/10 dark:bg-slate-400/10',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/20',
    label: 'Other',
  },
};

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  size = 'md',
  className,
}) => {
  const config = categoryStyles[category] || categoryStyles.OTHER;

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-md border transition-colors select-none font-medium',
          config.bg,
          config.text,
          config.border,
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
          className
        )
      )}
    >
      {config.label}
    </span>
  );
};
