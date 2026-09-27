import React from 'react';
import { Button } from '../ui/Button.js';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationCardProps {
  action: string;
  count: number;
  targetTitle?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading?: boolean;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  count,
  targetTitle,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  return (
    <div className="bg-[var(--surface)] border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-5 shadow-lg flex flex-col gap-4 max-w-xl w-full">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">
            Destructive Action
          </span>
          <h3 className="text-base font-semibold text-[var(--text)] mt-0.5">
            {count > 1
              ? `Are you sure? This will delete ${count} tasks.`
              : `Are you sure you want to delete "${targetTitle || 'this task'}"?`}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Tasks will be moved to Trash. You can undo or restore them within 30 days.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          leftIcon={<X className="w-3.5 h-3.5" />}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
        >
          {count > 1 ? `Delete ${count} Tasks` : 'Delete Task'}
        </Button>
      </div>
    </div>
  );
};
