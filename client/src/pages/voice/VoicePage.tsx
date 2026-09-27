import React, { useState } from 'react';
import { commandsApi } from '../../lib/api/commands.js';
import { CommandResponse } from '@voice2flow/shared';
import { ActionPreviewCard, ActionPreviewData } from '../../components/voice/ActionPreviewCard.js';
import { ConfirmationCard } from '../../components/voice/ConfirmationCard.js';

import { ClarificationCard } from '../../components/voice/ClarificationCard.js';
import { ResultCard } from '../../components/voice/ResultCard.js';
import { Sparkles, Send, User, Bot, CornerDownLeft } from 'lucide-react';
import { toast } from 'sonner';

interface MessageTurn {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  response?: CommandResponse;
}

export const VoicePage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turns, setTurns] = useState<MessageTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am your Voice2Flow assistant. Type any natural language instruction below to create tasks, manage your schedule, or run queries.',
    },
  ]);

  const handleSubmit = async (textToSubmit?: string) => {
    const text = (textToSubmit || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    const userTurnId = `user-${Date.now()}`;
    const assistantTurnId = `assistant-${Date.now()}`;

    setTurns((prev) => [
      ...prev,
      { id: userTurnId, role: 'user', text },
    ]);

    setIsLoading(true);
    try {
      const response = await commandsApi.execute({
        text,
        inputMode: 'TEXT',
      });

      setTurns((prev) => [
        ...prev,
        { id: assistantTurnId, role: 'assistant', response },
      ]);

      if (response.status === 'EXECUTED') {
        toast.success(response.summary);
      } else if (response.status === 'FAILED') {
        toast.error(response.error.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Command execution failed');
      setTurns((prev) => [
        ...prev,
        {
          id: assistantTurnId,
          role: 'assistant',
          text: 'I ran into an error processing that instruction. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (turnId: string, executionId: string, overrides?: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const response = await commandsApi.confirm(executionId, overrides);
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, response } : t))
      );
      if (response.status === 'EXECUTED') {
        toast.success(response.summary);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (turnId: string, executionId: string) => {
    try {
      await commandsApi.cancel(executionId);
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, response: undefined, text: 'Action was cancelled.' }
            : t
        )
      );
      toast.info('Command cancelled');
    } catch {
      // Cancellation is best-effort
    }
  };


  const handleResolveOption = async (turnId: string, executionId: string, optionId: string) => {
    setIsLoading(true);
    try {
      const response = await commandsApi.resolve(executionId, optionId);
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, response } : t))
      );
      if (response.status === 'EXECUTED') {
        toast.success(response.summary);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomAnswer = async (turnId: string, executionId: string, answer: string) => {
    setIsLoading(true);
    try {
      const response = await commandsApi.resolve(executionId, undefined, answer);
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, response } : t))
      );
      if (response.status === 'EXECUTED') {
        toast.success(response.summary);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleChips = [
    'Create a high priority task to finish my DBMS assignment tomorrow at 6 PM',
    'Complete my assignment',
    'Delete all my tasks',
    'Show my overdue tasks',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)] flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </span>
            Voice & Text Commands
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Deterministic language understanding pipeline with automatic safety verification.
          </p>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`flex items-start gap-3 ${
              turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs shadow-sm ${
                turn.role === 'user'
                  ? 'bg-[#7C5CFF] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
              }`}
            >
              {turn.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#7C5CFF]" />}
            </div>

            {/* Content */}
            <div
              className={`flex flex-col gap-2 max-w-xl ${
                turn.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {turn.text && (
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    turn.role === 'user'
                      ? 'bg-[#7C5CFF] text-white rounded-tr-none'
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-tl-none'
                  }`}
                >
                  {turn.text}
                </div>
              )}

              {/* Render dynamic response cards */}
              {turn.response?.status === 'EXECUTED' && (
                <ResultCard
                  executionId={turn.response.executionId}
                  summary={turn.response.summary}
                  result={turn.response.result}
                />
              )}

              {turn.response?.status === 'NEEDS_CONFIRMATION' && (() => {
                const confResp = turn.response;
                const preview = confResp.preview as ActionPreviewData;
                return (
                  <>
                    {preview?.action === 'DELETE_TASK' ? (
                      <ConfirmationCard
                        action={preview.action}
                        count={preview.count ?? 1}
                        targetTitle={preview.targetTitle}
                        onConfirm={() =>
                          handleConfirm(turn.id, confResp.executionId)
                        }
                        onCancel={() =>
                          handleCancel(turn.id, confResp.executionId)
                        }
                        isLoading={isLoading}
                      />
                    ) : (
                      <ActionPreviewCard
                        executionId={confResp.executionId}
                        preview={preview}
                        confidence={confResp.confidence}
                        assumptions={confResp.assumptions}
                        expiresAt={confResp.expiresAt}
                        onConfirm={(overrides) =>
                          handleConfirm(turn.id, confResp.executionId, overrides)
                        }
                        onCancel={() =>
                          handleCancel(turn.id, confResp.executionId)
                        }
                        isLoading={isLoading}
                      />
                    )}
                  </>
                );
              })()}

              {turn.response?.status === 'NEEDS_CLARIFICATION' && (() => {
                const clarResp = turn.response;
                return (
                  <ClarificationCard
                    executionId={clarResp.executionId}
                    question={clarResp.question}
                    options={clarResp.options}
                    onSelectOption={(optId) =>
                      handleResolveOption(turn.id, clarResp.executionId, optId)
                    }
                    onCustomAnswer={(ans) =>
                      handleCustomAnswer(turn.id, clarResp.executionId, ans)
                    }
                    onCancel={() =>
                      handleCancel(turn.id, clarResp.executionId)
                    }
                    isLoading={isLoading}
                  />
                );
              })()}


              {turn.response?.status === 'FAILED' && (
                <div className="px-4 py-2.5 rounded-2xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                  {turn.response.error.message}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center border border-[var(--border)]">
              <Bot className="w-4 h-4 text-[#7C5CFF] animate-pulse" />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF] animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Suggested chips */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex-shrink-0">
          Try:
        </span>
        {exampleChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSubmit(chip)}
            disabled={isLoading}
            className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] hover:border-[#7C5CFF]/50 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="pt-2 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a natural language instruction..."
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#7C5CFF]/50 shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)]">
            <CornerDownLeft className="w-3 h-3" />
          </div>
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          aria-label="Send command"
          className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] text-white flex items-center justify-center shadow-md disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
