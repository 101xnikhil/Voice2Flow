import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { BottomNav } from './BottomNav.js';
import { ThemeToggle } from '../ThemeToggle.js';
import { CommandPalette } from '../voice/CommandPalette.js';
import { Sparkles, Command, Search } from 'lucide-react';

export const AppShell: React.FC = () => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop / Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Desktop / Tablet Top Bar */}
        <header className="hidden md:flex h-14 items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0 z-20">
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[#7C5CFF]/40 transition-colors w-72"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Command Palette...</span>
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-[10px]">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[var(--text-muted)]">Voice2Flow v0.1</span>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] bg-clip-text text-transparent">
              Voice2Flow
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
              aria-label="Open Command Palette"
            >
              <Search className="w-4 h-4" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />
    </div>
  );
};
