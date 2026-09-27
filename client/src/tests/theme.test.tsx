import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../stores/ui.js';

describe('Client Theme Store', () => {
  beforeEach(() => {
    window.localStorage?.clear();
    document.documentElement.classList.remove('dark');
  });

  it('initializes with default system or light theme', () => {
    const { theme } = useUIStore.getState();
    expect(['system', 'light', 'dark']).toContain(theme);
  });

  it('updates theme to dark and applies dark class to document root', () => {
    const { setTheme } = useUIStore.getState();
    setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
    expect(useUIStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('updates theme to light and removes dark class from document root', () => {
    const { setTheme } = useUIStore.getState();
    setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
    expect(useUIStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
