import { create } from 'zustand';
import { ThemeMode } from '@voice2flow/shared';

interface UIState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'v2f_theme';

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  } catch {
    return null;
  }
}

function setStoredTheme(theme: ThemeMode) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage write errors
  }
}

function getInitialTheme(): ThemeMode {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return theme;
}

function applyThemeToDom(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useUIStore = create<UIState>((set) => {
  const initialTheme = getInitialTheme();
  const initialResolved = resolveTheme(initialTheme);
  applyThemeToDom(initialResolved);

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,
    setTheme: (theme: ThemeMode) => {
      setStoredTheme(theme);
      const resolved = resolveTheme(theme);
      applyThemeToDom(resolved);
      set({ theme, resolvedTheme: resolved });
    },
  };
});

// Listen for system theme changes when mode is 'system'
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useUIStore.getState();
    if (state.theme === 'system') {
      const resolved = resolveTheme('system');
      applyThemeToDom(resolved);
      useUIStore.setState({ resolvedTheme: resolved });
    }
  });
}
