import React, { useState, useEffect } from 'react';
import { executionsApi, ExecutionStepDTO } from '../../lib/api/executions.js';
import { Check, X, Clock, Terminal, Code } from 'lucide-react';

interface UnderTheHoodProps {
  executionId: string;
  rawInput?: string;
  parsed?: Record<string, unknown>;
  initialSteps?: ExecutionStepDTO[];
}

export const UnderTheHood: React.FC<UnderTheHoodProps> = ({
  executionId,
  rawInput,
  parsed,
  initialSteps,
}) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'json' | 'raw'>('steps');
  const [steps, setSteps] = useState<ExecutionStepDTO[]>(initialSteps || []);
  const [isLoading, setIsLoading] = useState(!initialSteps || initialSteps.length === 0);

  useEffect(() => {
    let isMounted = true;
    if (!initialSteps || initialSteps.length === 0) {
      executionsApi
        .getById(executionId)
        .then((data) => {
          if (isMounted && data.steps) {
            setSteps(data.steps);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [executionId, initialSteps]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Check className="w-3 h-3 text-emerald-500" />;
      case 'FAILED':
        return <X className="w-3 h-3 text-rose-500" />;
      case 'WAITING':
      case 'RUNNING':
        return <Clock className="w-3 h-3 text-amber-500 animate-spin" />;
      default:
        return <span className="text-[10px] text-[var(--text-muted)]">⤼</span>;
    }
  };

  return (
    <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden text-xs">
      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface)] px-2">
        <button
          type="button"
          onClick={() => setActiveTab('steps')}
          className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'steps'
              ? 'border-[#7C5CFF] text-[#7C5CFF]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Timeline ({steps.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'json'
              ? 'border-[#7C5CFF] text-[#7C5CFF]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Code className="w-3 h-3" />
          <span>Parsed JSON</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('raw')}
          className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'raw'
              ? 'border-[#7C5CFF] text-[#7C5CFF]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Terminal className="w-3 h-3" />
          <span>Raw Input</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-3">
        {activeTab === 'steps' && (
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-[11px] text-[var(--text-muted)] italic">Loading execution steps...</p>
            ) : steps.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)]">No execution steps recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.id || step.seq} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text)] text-[11px]">
                          {step.seq}. {step.name}
                        </span>
                        {step.durationMs !== undefined && step.durationMs !== null && (
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">
                            {step.durationMs}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'json' && (
          <pre className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-mono text-[11px] text-[var(--text)] overflow-x-auto max-h-48">
            {parsed ? JSON.stringify(parsed, null, 2) : '// No parsed JSON available'}
          </pre>
        )}

        {activeTab === 'raw' && (
          <div className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-mono text-[11px] text-[var(--text)]">
            {rawInput || '// No raw input recorded'}
          </div>
        )}
      </div>
    </div>
  );
};
