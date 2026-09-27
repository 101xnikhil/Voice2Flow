import React from 'react';
import { NavLink } from 'react-router-dom';
import { CheckSquare, Settings, User as UserIcon, LogOut, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.js';
import { ThemeToggle } from '../ThemeToggle.js';
import { clsx } from 'clsx';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { to: '/app/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/app/settings', label: 'Settings', icon: Settings },
    { to: '/app/profile', label: 'Profile', icon: UserIcon },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className="hidden md:flex flex-col flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-200 md:w-16 lg:w-60 z-30">
      {/* Brand / Logo */}
      <div className="h-16 flex items-center px-4 lg:px-5 border-b border-[var(--border)] gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] flex items-center justify-center shadow-md flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="hidden lg:flex flex-col">
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-[#7C5CFF] to-[#22D3EE] bg-clip-text text-transparent">
            Voice2Flow
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono -mt-1">v0.1.0</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 lg:px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                  isActive
                    ? 'bg-[#7C5CFF]/10 text-[#7C5CFF] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                )
              }
              title={item.label}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User & Actions */}
      <div className="p-3 border-t border-[var(--border)] flex flex-col gap-2">
        <div className="flex items-center justify-center lg:justify-between px-1">
          <span className="hidden lg:inline text-xs font-medium text-[var(--text-muted)]">Theme</span>
          <ThemeToggle />
        </div>

        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-3">
          <NavLink
            to="/app/profile"
            className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            title="View Profile"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
              {getInitials(user?.name)}
            </div>
            <div className="hidden lg:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[var(--text)] truncate">
                {user?.name || 'User'}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] truncate">
                {user?.email}
              </span>
            </div>
          </NavLink>

          <button
            onClick={() => logout()}
            title="Log out"
            aria-label="Log out"
            className="text-[var(--text-muted)] hover:text-[#DC2626] p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
