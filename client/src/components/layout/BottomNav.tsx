import React from 'react';
import { NavLink } from 'react-router-dom';
import { CheckSquare, Settings, User as UserIcon, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

export const BottomNav: React.FC = () => {
  const handleMicClick = () => {
    toast.info('Coming in the voice phase (Phase 3)', {
      description: 'Voice capture and real-time STT will be enabled in Phase 3.',
    });
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-around relative">
        {/* Tasks Link */}
        <NavLink
          to="/app/tasks"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium transition-colors',
              isActive
                ? 'text-[#7C5CFF]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )
          }
        >
          <CheckSquare className="w-5 h-5" />
          <span>Tasks</span>
        </NavLink>

        {/* Settings Link */}
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium transition-colors',
              isActive
                ? 'text-[#7C5CFF]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            )
          }
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>

        {/* Raised Center Mic Placeholder */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            type="button"
            onClick={handleMicClick}
            aria-label="Voice input (Coming in voice phase)"
            title="Coming in the voice phase"
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#7C5CFF]/60 to-[#22D3EE]/60 text-white flex items-center justify-center shadow-lg border-4 border-[var(--surface)] opacity-75 active:scale-95 transition-all cursor-pointer p-3"
          >
            <Mic className="w-6 h-6 text-white/90" />
          </button>
          <span className="text-[10px] font-medium text-[var(--text-muted)] mt-1">
            Voice
          </span>
        </div>

        {/* Profile Link */}
        <NavLink
          to="/app/profile"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium transition-colors',
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
