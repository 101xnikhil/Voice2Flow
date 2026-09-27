import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.js';
import { usersApi } from '../../lib/api/users.js';
import { Button } from '../../components/ui/Button.js';
import { Select } from '../../components/ui/Select.js';
import { Input } from '../../components/ui/Input.js';
import { useThemeStore } from '../../stores/ui.js';
import { toast } from 'sonner';
import { Moon, Sun, Monitor, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useAuthStore();
  const { theme: activeUiTheme, setTheme: setUiTheme } = useThemeStore();

  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [weekStartsOn, setWeekStartsOn] = useState<number>(1);
  const [defaultReminderOffsetMin, setDefaultReminderOffsetMin] = useState<number>(60);
  const [autoExecute, setAutoExecute] = useState<boolean>(true);
  const [autoExecuteThreshold, setAutoExecuteThreshold] = useState<number>(0.85);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTheme((settings.theme as 'system' | 'light' | 'dark') || 'system');
      setTimezone(settings.sttLocale || 'Asia/Kolkata');
      setWeekStartsOn(settings.weekStartsOn ?? 1);
      setDefaultReminderOffsetMin(settings.defaultReminderOffsetMin ?? 60);
      setAutoExecute(settings.autoExecute ?? true);
      setAutoExecuteThreshold(settings.autoExecuteThreshold ?? 0.85);
      setShowConfidence(settings.showConfidence ?? true);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await usersApi.updateSettings({
        theme,
        weekStartsOn: weekStartsOn as 0 | 1,
        defaultReminderOffsetMin,
        autoExecute,
        autoExecuteThreshold,
        showConfidence,
      });

      updateSettings(updated);
      setUiTheme(theme);
      toast.success('Settings saved successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };


  const handleThemeChange = (selectedTheme: 'system' | 'light' | 'dark') => {
    setTheme(selectedTheme);
    setUiTheme(selectedTheme);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Manage your personal workspace preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Appearance / Theme */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Appearance</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Choose your preferred color theme for the interface.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = (theme || activeUiTheme) === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleThemeChange(item.id as 'system' | 'light' | 'dark')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-xs font-medium gap-2 ${
                    isSelected
                      ? 'border-[#7C5CFF] bg-[#7C5CFF]/10 text-[#7C5CFF] ring-2 ring-[#7C5CFF]/20 font-semibold'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Automation & Safety */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Automation & Confidence</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Control when instructions execute immediately versus requiring preview confirmation.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Auto-execute toggle */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[var(--surface-2)]">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Auto-Execute Normal Actions</label>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Immediately perform non-destructive actions when confidence meets or exceeds your threshold.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoExecute}
                onChange={(e) => setAutoExecute(e.target.checked)}
                className="w-4 h-4 rounded text-[#7C5CFF] focus:ring-[#7C5CFF] accent-[#7C5CFF]"
              />
            </div>

            {/* Threshold slider */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--surface-2)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text)]">
                  Auto-Execute Confidence Threshold
                </label>
                <span className="text-xs font-mono font-bold text-[#7C5CFF]">
                  {Math.round(autoExecuteThreshold * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Actions with confidence below this threshold will prompt for confirmation before running.
              </p>
              <input
                type="range"
                min="0.75"
                max="0.95"
                step="0.01"
                value={autoExecuteThreshold}
                onChange={(e) => setAutoExecuteThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[#7C5CFF]"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <span>75% (Faster)</span>
                <span>85% (Default)</span>
                <span>95% (Cautious)</span>
              </div>
            </div>

            {/* Show confidence indicator toggle */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[var(--surface-2)]">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Show Confidence Indicators</label>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Display confidence pills and inferred assumptions on command cards.
                </p>
              </div>
              <input
                type="checkbox"
                checked={showConfidence}
                onChange={(e) => setShowConfidence(e.target.checked)}
                className="w-4 h-4 rounded text-[#7C5CFF] focus:ring-[#7C5CFF] accent-[#7C5CFF]"
              />
            </div>

            {/* Deletion safety notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Safety Guarantee: </span>
              Destructive operations (deleting single or multiple tasks) always require explicit confirmation regardless of confidence settings.
            </div>
          </div>
        </div>

        {/* Workspace & Calendar Preferences */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">

          <h2 className="text-base font-semibold text-[var(--text)]">Preferences</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Customize date, time, and reminder defaults.
          </p>

          <div className="flex flex-col gap-4">
            <Input
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helper="Used for deadline relative calculations and reminders"
            />

            <Select
              label="Week Starts On"
              options={[
                { value: '1', label: 'Monday (Default)' },
                { value: '0', label: 'Sunday' },
              ]}
              value={String(weekStartsOn)}
              onChange={(e) => setWeekStartsOn(parseInt(e.target.value, 10))}
            />

            <Select
              label="Default Deadline Reminder Offset"
              options={[
                { value: '15', label: '15 minutes before' },
                { value: '30', label: '30 minutes before' },
                { value: '60', label: '1 hour before (Default)' },
                { value: '120', label: '2 hours before' },
                { value: '1440', label: '1 day before' },
              ]}
              value={String(defaultReminderOffsetMin)}
              onChange={(e) => setDefaultReminderOffsetMin(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
