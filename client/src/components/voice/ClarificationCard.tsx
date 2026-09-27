import React, { useState } from 'react';
import { Button } from '../ui/Button.js';
import { HelpCircle, ArrowRight, X } from 'lucide-react';

interface ClarificationOption {
  id: string;
  label: string;
}

interface ClarificationCardProps {
  executionId: string;
  question: string;
  options?: ClarificationOption[];
  onSelectOption: (optionId: string) => Promise<void>;
  onCustomAnswer: (answer: string) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading?: boolean;
}

export const ClarificationCard: React.FC<ClarificationCardProps> = ({
  question,
  options = [],
  onSelectOption,
  onCustomAnswer,
  onCancel,
  isLoading = false,
}) => {
  const [customAnswer, setCustomAnswer] = useState('');

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAnswer.trim()) {
      onCustomAnswer(customAnswer.trim());
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-lg flex flex-col gap-4 max-w-xl w-full">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">
            Clarification Needed
          </span>
          <p className="text-sm font-medium text-[var(--text)] mt-0.5 leading-snug">
            {question}
          </p>
        </div>
      </div>

      {/* Selectable Options */}
      {options.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          {options.map((option, idx) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectOption(option.id)}
              disabled={isLoading}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[#7C5CFF]/50 hover:bg-[#7C5CFF]/5 transition-all text-left text-xs font-medium text-[var(--text)] group disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] group-hover:border-[#7C5CFF] group-hover:text-[#7C5CFF]">
                  {idx + 1}
                </span>
                <span>{option.label}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[#7C5CFF] group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      )}

      {/* Freeform answer input */}
      <form onSubmit={handleSubmitCustom} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={customAnswer}
          onChange={(e) => setCustomAnswer(e.target.value)}
          placeholder="Type an answer or option..."
          className="flex-1 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#7C5CFF]"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={!customAnswer.trim() || isLoading}
          isLoading={isLoading}
        >
          Reply
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
