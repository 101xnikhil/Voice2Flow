import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 pointer-events-none flex md:justify-end items-end md:items-stretch">
        {/* Drawer container: Bottom sheet on mobile, right slide-in on md+ */}
        <div
          role="dialog"
          aria-modal="true"
          className={twMerge(
            clsx(
              'pointer-events-auto flex flex-col w-full bg-[var(--surface)] border-[var(--border)] shadow-2xl z-10 transition-transform duration-300',
              // Mobile styles: bottom sheet
              'max-h-[90vh] rounded-t-2xl border-t',
              // Desktop/tablet styles: right drawer
              'md:max-h-full md:h-full md:max-w-md md:rounded-t-none md:border-t-0 md:border-l',
              className
            )
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
              {description && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="text-[var(--text-muted)] hover:text-[var(--text)] p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
};
