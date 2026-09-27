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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTheme((settings.theme as 'system' | 'light' | 'dark') || 'system');
      setTimezone(settings.sttLocale || 'Asia/Kolkata');
      setWeekStartsOn(settings.weekStartsOn ?? 1);
      setDefaultReminderOffsetMin(settings.defaultReminderOffsetMin ?? 60);
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
