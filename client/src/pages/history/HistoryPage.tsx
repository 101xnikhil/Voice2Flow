import React, { useState, useEffect } from 'react';
import { executionsApi, WorkflowExecutionDTO } from '../../lib/api/executions.js';
import { UnderTheHood } from '../../components/voice/UnderTheHood.js';
import { Button } from '../../components/ui/Button.js';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Search,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<WorkflowExecutionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecutionDTO | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadExecutions = async () => {
    setIsLoading(true);
    try {
      const data = await executionsApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setExecutions(data);
      if (data.length > 0 && !selectedExecution) {
        setSelectedExecution(data[0] || null);
      }
    } catch (err: unknown) {

      toast.error(err instanceof Error ? err.message : 'Failed to load execution history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, [statusFilter]);

  const handleCancelExecution = async (id: string) => {
    try {
      const updated = await executionsApi.cancel(id);
      setExecutions((prev) => prev.map((e) => (e.id === id ? { ...e, status: updated.status } : e)));
      if (selectedExecution?.id === id) {
        setSelectedExecution((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
      toast.success('Execution cancelled');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel execution');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Succeeded
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'WAITING':
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-spin" />
            {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/20">
            {status}
          </span>
        );
    }
  };

  const filtered = executions.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const intent = (e.parsed as Record<string, unknown> | null)?.intent;
    return (
      e.rawInput?.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      (typeof intent === 'string' && intent.toLowerCase().includes(q))
    );
  });


  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] flex items-center gap-2">
          <History className="w-6 h-6 text-[#7C5CFF]" />
          Execution History
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Audit trail and pipeline step timeline of all commands and workflow executions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] p-3 rounded-2xl border border-[var(--border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'SUCCEEDED', 'WAITING', 'FAILED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#7C5CFF] text-white shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-2)] text-xs text-[var(--text)] placeholder-[var(--text-muted)] border border-[var(--border)] focus:outline-none"
          />
        </div>
      </div>

      {/* Main Split Layout: List and Detail Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Executions List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Loading executions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
              No executions found matching criteria.
            </div>
          ) : (
            filtered.map((exec) => {
              const isSelected = selectedExecution?.id === exec.id;
              const intent = (exec.parsed as Record<string, unknown> | null)?.intent as string | undefined;
              return (
                <button
                  key={exec.id}
                  type="button"
                  onClick={() => setSelectedExecution(exec)}
                  className={`flex flex-col gap-2 p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#7C5CFF] bg-[#7C5CFF]/5 ring-2 ring-[#7C5CFF]/20'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-[var(--text)] truncate">
                      {exec.rawInput || 'Manual execution'}
                    </span>
                    {getStatusBadge(exec.status)}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-2">
                      {intent && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-2)] font-mono text-[10px]">
                          {intent}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-2)] font-mono text-[10px]">
                        {exec.parser}
                      </span>
                    </div>
                    <span>{new Date(exec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Execution Details & Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          {selectedExecution ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--text)]">
                      {selectedExecution.rawInput || 'Execution Details'}
                    </h2>
                    {getStatusBadge(selectedExecution.status)}
                  </div>
                  <p className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
                    ID: {selectedExecution.id} · Started: {new Date(selectedExecution.startedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedExecution.status === 'WAITING' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelExecution(selectedExecution.id)}
                    >
                      Cancel
                    </Button>
                  )}
                  {selectedExecution.rawInput && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigate('/app/voice');
                      }}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Run in Voice
                    </Button>
                  )}
                </div>
              </div>

              {/* Execution Steps Timeline */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Pipeline & Node Timeline:
                </h3>
                <UnderTheHood
                  executionId={selectedExecution.id}
                  rawInput={selectedExecution.rawInput || undefined}
                  parsed={selectedExecution.parsed as Record<string, unknown> | undefined}
                  initialSteps={selectedExecution.steps}
                />
              </div>
            </div>
          ) : (

            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              Select an execution to inspect its timeline and details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
