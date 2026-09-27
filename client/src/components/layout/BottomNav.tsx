import React from 'react';
import { NavLink } from 'react-router-dom';
import { CheckSquare, History, Settings, User as UserIcon, Mic } from 'lucide-react';
import { clsx } from 'clsx';

export const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around relative">
        {/* Tasks Link */}
        <NavLink
          to="/app/tasks"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 py-1 px-2.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-[#7C5CFF]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )
          }
        >
          <CheckSquare className="w-5 h-5" />
          <span>Tasks</span>
        </NavLink>

        {/* History Link */}
        <NavLink
          to="/app/history"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 py-1 px-2.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-[#7C5CFF]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )
          }
        >
          <History className="w-5 h-5" />
          <span>History</span>
        </NavLink>

        {/* Raised Center Voice Button */}
        <div className="relative -top-4 flex flex-col items-center">
          <NavLink
            to="/app/voice"
            aria-label="Voice & Commands"
            title="Voice & Commands"
            className={({ isActive }) =>
              clsx(
                'w-12 h-12 rounded-full bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] text-white flex items-center justify-center shadow-lg border-4 border-[var(--surface)] active:scale-95 transition-all cursor-pointer p-2.5',
                isActive && 'ring-2 ring-[#7C5CFF]'
              )
            }
          >
            <Mic className="w-5 h-5 text-white" />
          </NavLink>
          <span className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">
            Voice
          </span>
        </div>

        {/* Settings Link */}
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 py-1 px-2.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-[#7C5CFF]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )
          }
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>

        {/* Profile Link */}
        <NavLink
          to="/app/profile"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 py-1 px-2.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-[#7C5CFF]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )
          }
        >
          <UserIcon className="w-5 h-5" />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
