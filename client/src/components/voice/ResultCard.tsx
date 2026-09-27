import React, { useState } from 'react';
import { Button } from '../ui/Button.js';
import { UnderTheHood } from './UnderTheHood.js';
import { CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi } from '../../lib/api/tasks.js';

interface ResultCardProps {
  executionId: string;
  summary: string;
  result?: unknown;
  rawInput?: string;
  parsed?: Record<string, unknown>;
  onUndoSuccess?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  executionId,
  summary,
  result,
  rawInput,
  parsed,
  onUndoSuccess,
}) => {
  const [showUnderTheHood, setShowUnderTheHood] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isUndone, setIsUndone] = useState(false);

  const taskResult = result as { id?: string; title?: string; status?: string } | undefined;

  const handleUndo = async () => {
    if (!taskResult?.id) {
      toast.info('Undo is not available for this action');
      return;
    }

    setIsUndoing(true);
    try {
      if (summary.toLowerCase().includes('create')) {
        // Undo create = soft delete
        await tasksApi.softDeleteTask(taskResult.id);
        setIsUndone(true);
        toast.success(`Removed created task "${taskResult.title || 'Task'}"`);
      } else if (summary.toLowerCase().includes('complete')) {
        // Undo complete = reopen
        await tasksApi.reopenTask(taskResult.id);
        setIsUndone(true);
        toast.success(`Reopened task "${taskResult.title || 'Task'}"`);
      } else if (summary.toLowerCase().includes('delete')) {
        // Undo delete = restore
        await tasksApi.restoreTask(taskResult.id);
        setIsUndone(true);
        toast.success(`Restored task "${taskResult.title || 'Task'}"`);
      } else {
        toast.info('Undo action executed');
      }
      onUndoSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to undo action');
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-lg flex flex-col gap-3 max-w-xl w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
              Completed
            </span>
            <p className="text-sm font-semibold text-[var(--text)] mt-0.5">
              {summary}
            </p>
          </div>
        </div>

        {taskResult?.id && !isUndone && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            isLoading={isUndoing}
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Undo
          </Button>
        )}
      </div>

      {isUndone && (
        <div className="p-2 rounded-lg bg-[var(--surface-2)] text-xs text-[var(--text-muted)] italic">
          Action was undone.
        </div>
      )}

      {/* Under The Hood Toggle */}
      <div className="pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => setShowUnderTheHood(!showUnderTheHood)}
          className="flex items-center justify-between w-full text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1"
        >
          <span className="font-medium">Under the hood details</span>
          {showUnderTheHood ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showUnderTheHood && (
          <div className="mt-2">
            <UnderTheHood
              executionId={executionId}
              rawInput={rawInput}
              parsed={parsed}
            />
          </div>
        )}
      </div>
    </div>
  );
};
