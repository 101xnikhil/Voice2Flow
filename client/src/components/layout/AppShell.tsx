import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { BottomNav } from './BottomNav.js';
import { ThemeToggle } from '../ThemeToggle.js';
import { Sparkles } from 'lucide-react';

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop / Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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
          <ThemeToggle />
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
    </div>
  );
};
