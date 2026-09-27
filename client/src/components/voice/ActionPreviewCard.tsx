import React, { useState } from 'react';
import { ConfidencePill } from './ConfidencePill.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Select } from '../ui/Select.js';
import { Check, X, Clock, Tag, Flag } from 'lucide-react';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@voice2flow/shared';

export interface ActionPreviewData {
  action: string;
  count?: number;
  targetTitle?: string;
  steps: string[];
  entities?: {
    title?: string;
    category?: string;
    priority?: string;
    date?: string;
    time?: string;
    description?: string;
  };
}

interface ActionPreviewCardProps {
  executionId: string;
  preview: ActionPreviewData;
  confidence: number;
  assumptions?: string[];
  expiresAt?: string;
  onConfirm: (overrides?: Record<string, unknown>) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading?: boolean;
}

export const ActionPreviewCard: React.FC<ActionPreviewCardProps> = ({
  preview,
  confidence,
  assumptions = [],
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(preview.entities?.title || preview.targetTitle || '');
  const [priority, setPriority] = useState(preview.entities?.priority || 'MEDIUM');
  const [category, setCategory] = useState(preview.entities?.category || 'OTHER');

  const handleConfirm = () => {
    if (isEditing) {
      onConfirm({
        title,
        priority,
        category,
      });
    } else {
      onConfirm();
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-lg flex flex-col gap-4 max-w-xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-[#7C5CFF]/15 text-[#7C5CFF]">
            {preview.action.replace('_', ' ')}
          </span>
          <ConfidencePill confidence={confidence} assumptions={assumptions} />
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors underline"
        >
          {isEditing ? 'Cancel Edit' : 'Edit details'}
        </button>
      </div>

      {/* Main Content */}
      {isEditing ? (
        <div className="flex flex-col gap-3 py-2 border-y border-[var(--border)]">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={TASK_PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={TASK_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 py-1">
          <h3 className="text-base font-semibold text-[var(--text)] tracking-tight">
            {title || 'Pending Action'}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            {preview.entities?.date && (
              <span className="inline-flex items-center gap-1 bg-[var(--surface-2)] px-2.5 py-1 rounded-md">
                <Clock className="w-3 h-3 text-[#7C5CFF]" />
                {preview.entities.date} {preview.entities.time || ''}
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 bg-[var(--surface-2)] px-2.5 py-1 rounded-md">
                <Tag className="w-3 h-3 text-[#22D3EE]" />
                {category}
              </span>
            )}
            {priority && (
              <span className="inline-flex items-center gap-1 bg-[var(--surface-2)] px-2.5 py-1 rounded-md">
                <Flag className="w-3 h-3 text-amber-400" />
                {priority}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Steps overview */}
      {preview.steps && preview.steps.length > 0 && (
        <div className="bg-[var(--surface-2)] rounded-xl p-3 flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text)] text-[11px] uppercase tracking-wider">
            Workflow Steps:
          </span>
          <ol className="list-decimal list-inside space-y-1">
            {preview.steps.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
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
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          isLoading={isLoading}
          leftIcon={<Check className="w-3.5 h-3.5" />}
        >
          Confirm & Execute
        </Button>
      </div>
    </div>
  );
};
