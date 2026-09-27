import React from 'react';
import { useUIStore } from '../stores/ui.js';
import { Sun, Moon, Laptop } from 'lucide-react';
import { ThemeMode } from '@voice2flow/shared';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useUIStore();

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { mode: 'system', label: 'System', icon: <Laptop className="w-4 h-4" /> },
    { mode: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  ];

  return (
    <div className="inline-flex items-center p-1 rounded-full bg-surface-2 border border-border">
      {options.map((opt) => {
        const isActive = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            onClick={() => setTheme(opt.mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
              isActive
                ? 'bg-surface text-text shadow-sm border border-border'
                : 'text-text-muted hover:text-text'
            }`}
            title={`Set theme to ${opt.label} (currently ${resolvedTheme})`}
            aria-label={`Set theme to ${opt.label}`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
