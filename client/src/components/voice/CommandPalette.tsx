import React, { useState, useEffect, useRef } from 'react';
import { commandsApi } from '../../lib/api/commands.js';
import { CommandResponse } from '@voice2flow/shared';
import { ActionPreviewCard, ActionPreviewData } from './ActionPreviewCard.js';
import { ConfirmationCard } from './ConfirmationCard.js';
import { ClarificationCard } from './ClarificationCard.js';
import { ResultCard } from './ResultCard.js';
import { Search, Sparkles, X, CornerDownLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommandExecuted?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onCommandExecuted,
}) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<CommandResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setResponse(null);
      setText('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await commandsApi.execute({
        text: text.trim(),
        inputMode: 'TEXT',
      });
      setResponse(res);
      if (res.status === 'EXECUTED') {
        toast.success(res.summary);
        onCommandExecuted?.();
      } else if (res.status === 'FAILED') {
        toast.error(res.error.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (overrides?: Record<string, unknown>) => {
    if (!response || response.status !== 'NEEDS_CONFIRMATION') return;
    setIsLoading(true);
    try {
      const res = await commandsApi.confirm(response.executionId, overrides);
      setResponse(res);
      if (res.status === 'EXECUTED') {
        toast.success(res.summary);
        onCommandExecuted?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!response || !('executionId' in response) || !response.executionId) {
      onClose();
      return;
    }
    try {
      await commandsApi.cancel(response.executionId);
    } catch {
      // Cancellation on close is best-effort
    }
    onClose();
  };


  const handleResolveOption = async (optionId: string) => {
    if (!response || response.status !== 'NEEDS_CLARIFICATION') return;
    setIsLoading(true);
    try {
      const res = await commandsApi.resolve(response.executionId, optionId);
      setResponse(res);
      if (res.status === 'EXECUTED') {
        toast.success(res.summary);
        onCommandExecuted?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomAnswer = async (answer: string) => {
    if (!response || response.status !== 'NEEDS_CLARIFICATION') return;
    setIsLoading(true);
    try {
      const res = await commandsApi.resolve(response.executionId, undefined, answer);
      setResponse(res);
      if (res.status === 'EXECUTED') {
        toast.success(res.summary);
        onCommandExecuted?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Command Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] text-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a natural language command (e.g. Create a DBMS task for tomorrow at 6 PM)..."
            disabled={isLoading && !response}
            className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="text-[var(--text-muted)] hover:text-[var(--text)] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 border border-[var(--border)] hover:text-[var(--text)]"
          >
            <span>Enter</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </form>

        {/* Content / Result Area */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {isLoading && !response && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-xs text-[var(--text-muted)]">
              <Sparkles className="w-6 h-6 text-[#7C5CFF] animate-pulse" />
              <span>Interpreting natural language command...</span>
            </div>
          )}

          {!response && !isLoading && (
            <div className="py-6 flex flex-col gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-1">
                Suggested Commands:
              </span>
              <div className="flex flex-col gap-1.5">
                {[
                  'Create a high priority task to finish my DBMS assignment tomorrow at 6 PM',
                  'Complete my assignment',
                  'Delete all my tasks',
                  'Show my overdue tasks',
                ].map((cmd, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setText(cmd);
                      setTimeout(() => inputRef.current?.focus(), 10);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors group"
                  >
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[#7C5CFF]" />
                    <span>{cmd}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {response?.status === 'EXECUTED' && (
            <div className="flex justify-center">
              <ResultCard
                executionId={response.executionId}
                summary={response.summary}
                result={response.result}
                rawInput={text}
                onUndoSuccess={onCommandExecuted}
              />
            </div>
          )}

          {response?.status === 'NEEDS_CONFIRMATION' && (() => {
            const preview = response.preview as ActionPreviewData;
            return (

              <div className="flex justify-center">
                {preview?.action === 'DELETE_TASK' ? (
                  <ConfirmationCard
                    action={preview.action}
                    count={preview.count ?? 1}
                    targetTitle={preview.targetTitle}
                    onConfirm={() => handleConfirm()}
                    onCancel={handleCancel}
                    isLoading={isLoading}
                  />
                ) : (
                  <ActionPreviewCard
                    executionId={response.executionId}
                    preview={preview}
                    confidence={response.confidence}
                    assumptions={response.assumptions}
                    expiresAt={response.expiresAt}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isLoading={isLoading}
                  />
                )}
              </div>
            );
          })()}


          {response?.status === 'NEEDS_CLARIFICATION' && (
            <div className="flex justify-center">
              <ClarificationCard
                executionId={response.executionId}
                question={response.question}
                options={response.options}
                onSelectOption={handleResolveOption}
                onCustomAnswer={handleCustomAnswer}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </div>
          )}

          {response?.status === 'FAILED' && (
            <div className="py-6 text-center text-xs text-rose-500 font-medium">
              {response.error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
