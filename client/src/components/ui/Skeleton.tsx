import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'animate-pulse rounded-md bg-[var(--surface-2)]/80 dark:bg-[var(--surface-2)]/60',
          className
        )
      )}
      {...props}
    />
  );
};
