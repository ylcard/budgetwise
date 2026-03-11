import { useEffect } from 'react';
import { Sun, Moon, Monitor, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccessibilityThemePicker from './AccessibilityThemePicker';
import { applyA11yTheme } from '@/components/utils/accessibilityThemes';

const MODES = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'scheduled', label: 'Scheduled', icon: Clock },
];

const AVAILABLE_THEMES = [
  { id: 'light', label: 'Light Theme' },
  { id: 'dark', label: 'Dark Theme' }
  // Future expansion: { id: 'midnight', label: 'Midnight Blue' }
];

// Helper to determine which scheduled theme is active right now
const getActiveScheduledTheme = (schedules) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Sort times chronologically
  const sorted = [...schedules].sort((a, b) => {
    const [aH, aM] = a.time.split(':').map(Number);
    const [bH, bM] = b.time.split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });

  if (sorted.length === 0) return 'light';

  // Default to the last schedule of the previous day
  let active = sorted[sorted.length - 1].theme;
  for (const sched of sorted) {
    const [h, m] = sched.time.split(':').map(Number);
    if (currentMinutes >= h * 60 + m) {
      active = sched.theme;
    } else {
      break;
    }
  }
  return active;
};

// Helper to strictly preview theme changes on the DOM without saving
const applyThemePreview = (config) => {
  applyA11yTheme(config.a11yTheme || 'none');

  const root = window.document.documentElement;
  let isDark = false;

  if (config.mode === 'dark') {
    isDark = true;
  } else if (config.mode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else if (config.mode === 'scheduled') {
    isDark = getActiveScheduledTheme(config.schedules || []) === 'dark';
  }

  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
};

export default function AppearanceSettings({ themeConfig, onChange, savedThemeConfig }) {
  const defaultSchedules = [{ time: '08:00', theme: 'light' }, { time: '20:00', theme: 'dark' }];
  const currentConfig = themeConfig || { mode: 'system', schedules: defaultSchedules, a11yTheme: 'none' };

  // Apply preview whenever the form value changes
  useEffect(() => {
    applyThemePreview(currentConfig);
  }, [currentConfig]);

  // Revert preview if component unmounts without saving
  useEffect(() => {
    return () => applyThemePreview(savedThemeConfig || { mode: 'system', a11yTheme: 'none' });
  }, [savedThemeConfig]);

  // Handle system preference changes for live preview
  useEffect(() => {
    if (currentConfig.mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyThemePreview(currentConfig);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [currentConfig]);

  // Re-check scheduled themes every minute
  useEffect(() => {
    if (currentConfig.mode === 'scheduled') {
      const interval = setInterval(() => applyThemePreview(currentConfig), 60000);
      return () => clearInterval(interval);
    }
  }, [currentConfig]);

  const handleModeChange = (newMode) => {
    if (currentConfig.mode === newMode) return;
    onChange({ ...currentConfig, mode: newMode });
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedules = [...(currentConfig.schedules || defaultSchedules)];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    onChange({ ...currentConfig, schedules: newSchedules });
  };

  const handleTimeChange = (field, value) => {
    onChange({ ...currentConfig, [field]: value });
  };

  const handleA11yThemeChange = (themeId) => {
    onChange({ ...currentConfig, a11yTheme: themeId });
  };

  const handleCancel = () => {
    setLocalConfig(savedThemeConfig);
    applyThemePreview(savedThemeConfig);
    setIsDirty(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Appearance</h3>
        </div>

        {/* Segmented Control */}
        <div className="flex p-1 bg-muted/40 rounded-lg border border-border sm:max-w-md w-full">
          {MODES.map(({ id, label, icon: Icon }) => {
            const isActive = currentConfig.mode === id;

            return (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className={twMerge(
                  clsx(
                    "relative flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all z-10",
                    isActive
                      ? "bg-background text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                  )
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline-block truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {currentConfig.mode === 'scheduled' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2 border-t border-border mt-2">
              {(currentConfig.schedules || defaultSchedules).map((schedule, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select
                      value={schedule.theme}
                      onValueChange={(val) => handleScheduleChange(idx, 'theme', val)}
                    >
                      <SelectTrigger className="h-8 text-sm bg-background border-border shadow-none focus:ring-1 focus:ring-primary w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_THEMES.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">At</span>
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => handleScheduleChange(idx, 'time', e.target.value)}
                      className="h-8 px-2 bg-background border border-border rounded-md text-sm outline-none text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>
              ))}

              {/* Dark Mode Start */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-foreground">Dark Theme</span>
                    <span className="text-xs text-muted-foreground">Turns on at</span>
                  </div>
                </div>
                <input
                  type="time"
                  value={currentConfig.darkStart || ''}
                  onChange={(e) => handleTimeChange('darkStart', e.target.value)}
                  className="bg-transparent border-none outline-none text-foreground font-medium text-right focus:ring-0 min-w-[80px]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADDED 11-Mar-2026: Accessibility theme picker */}
      <div className="pt-2 border-t border-border">
        <AccessibilityThemePicker
          value={currentConfig.a11yTheme || 'none'}
          onChange={handleA11yThemeChange}
        />
      </div>
    </div>
  );
}