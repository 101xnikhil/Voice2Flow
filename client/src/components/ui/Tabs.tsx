import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto no-scrollbar',
          className
        )
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={twMerge(
              clsx(
                'relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors select-none whitespace-nowrap',
                isActive
                  ? 'text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              )
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 text-xs rounded-full font-semibold transition-colors',
                  isActive
                    ? 'bg-[#7C5CFF]/15 text-[#7C5CFF]'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
