import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={twMerge(
          clsx(
            'relative w-full rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl z-10 transition-all duration-200 animate-in fade-in zoom-in-95',
            maxWidths[maxWidth],
            className
          )
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-[var(--text)]">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
