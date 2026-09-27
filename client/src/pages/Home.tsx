import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { Activity, CheckCircle2, AlertCircle, Sparkles, Layers, Terminal, Cpu } from 'lucide-react';
import { HealthResponse } from '@voice2flow/shared';

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/v1/health');
  if (!res.ok && res.status !== 503) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export const HomePage: React.FC = () => {
  const { data: health, isLoading, isError, error, refetch } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen bg-bg text-text selection:bg-accent-from/30 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-card gradient-accent flex items-center justify-center text-white font-bold shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight gradient-accent-text">
                Voice2Flow
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-accent-from/15 text-accent-from border border-accent-from/30">
                Phase 0: Scaffold
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            3rd-Year B.Tech CSE Mini-Project Foundation
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Natural Language Voice & Workflow <br />
            <span className="gradient-accent-text">Task Orchestration</span>
          </h1>
          <p className="text-text-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            A production-ready foundation with strict TypeScript, fail-fast configuration,
            centralized error management, and persistent design tokens.
          </p>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Server & Database Health */}
          <div className="p-6 rounded-panel bg-surface border border-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-accent-from" />
                <h2 className="font-semibold text-base">System Health Status</h2>
              </div>
              <button
                onClick={() => refetch()}
                className="text-xs text-accent-from hover:underline"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="py-6 flex items-center justify-center text-text-muted gap-2">
                <span className="w-4 h-4 border-2 border-accent-from border-t-transparent rounded-full animate-spin" />
                Checking API & Database...
              </div>
            ) : isError ? (
              <div className="p-4 rounded-card bg-danger/10 border border-danger/20 text-danger flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Backend Unreachable</p>
                  <p className="text-xs opacity-90">{String(error)}</p>
                </div>
              </div>
            ) : health ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-card bg-surface-2 border border-border">
                  <span className="text-xs text-text-muted">API Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    {health.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-card bg-surface-2 border border-border">
                  <span className="text-xs text-text-muted">PostgreSQL Database</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      health.database.status === 'connected' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {health.database.status === 'connected' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {health.database.status.toUpperCase()}
                    {health.database.latencyMs !== undefined && ` (${health.database.latencyMs}ms)`}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-card bg-surface-2 border border-border">
                  <span className="text-xs text-text-muted">AI Provider / Mode</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-from/10 text-accent-from border border-accent-from/20">
                    {health.ai.mode} ({health.ai.provider})
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-card bg-surface-2 border border-border">
                  <span className="text-xs text-text-muted">Scheduler</span>
                  <span className="text-xs font-mono text-text">
                    {health.scheduler.status}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Design System Tokens Showcase */}
          <div className="p-6 rounded-panel bg-surface border border-border shadow-card space-y-4">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-accent-to" />
              <h2 className="font-semibold text-base">Spec §3.2 Design Tokens</h2>
            </div>
            <p className="text-xs text-text-muted">
              Live token demonstration using pure CSS variables and zero external CDNs.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-card bg-surface-2 border border-border flex flex-col gap-1">
                <span className="text-text-muted text-[10px] uppercase font-mono">--bg</span>
                <span className="font-mono font-medium">var(--bg)</span>
              </div>
              <div className="p-3 rounded-card bg-surface border border-border flex flex-col gap-1">
                <span className="text-text-muted text-[10px] uppercase font-mono">--surface</span>
                <span className="font-mono font-medium">var(--surface)</span>
              </div>
              <div className="p-3 rounded-card gradient-accent text-white flex flex-col gap-1">
                <span className="text-white/80 text-[10px] uppercase font-mono">--accent</span>
                <span className="font-mono font-medium">#7C5CFF → #22D3EE</span>
              </div>
              <div className="p-3 rounded-card bg-surface-2 border border-border flex flex-col gap-1">
                <span className="text-text-muted text-[10px] uppercase font-mono">--text</span>
                <span className="font-mono font-medium">var(--text)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                Font: JetBrains Mono
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" />
                UI: Inter (@fontsource)
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-surface/50 text-center text-xs text-text-muted">
        <div className="max-w-6xl mx-auto px-4">
          Voice2Flow &copy; 2026 &bull; Strict TypeScript Monorepo &bull; Phase 0 Foundation
        </div>
      </footer>
    </div>
  );
};
