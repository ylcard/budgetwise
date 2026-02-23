import { useState, useEffect } from 'react';
import { useSettings } from '@/components/utils/SettingsContext';
import { Sun, Moon, Monitor, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function AppearanceSettings() {
  const { settings, updateSettings } = useSettings();

  const defaultSchedules = [{ time: '08:00', theme: 'light' }, { time: '20:00', theme: 'dark' }];
  const themeConfig = settings?.themeConfig || { mode: 'system', schedules: defaultSchedules };

  const handleModeChange = async (newMode) => {
    if (themeConfig.mode === newMode) return;

    await updateSettings({
      themeConfig: {
        ...themeConfig,
        mode: newMode
      }
    });
  };

  const handleScheduleChange = async (index, field, value) => {
    const newSchedules = [...(themeConfig.schedules || defaultSchedules)];
    newSchedules[index] = { ...newSchedules[index], [field]: value };

    await updateSettings({
      themeConfig: {
        ...themeConfig,
        schedules: newSchedules
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-1">Appearance</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Customize how BudgetWise looks on this device.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {MODES.map(({ id, label, icon: Icon }) => {
            const isActive = themeConfig.mode === id;

            return (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className={twMerge(
                  clsx(
                    "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )
                )}
              >
                <Icon className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{label}</span>

                {isActive && (
                  <motion.div
                    layoutId="active-mode-indicator"
                    className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {themeConfig.mode === 'scheduled' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-2">
              {(themeConfig.schedules || defaultSchedules).map((schedule, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <Select
                        value={schedule.theme}
                        onValueChange={(val) => handleScheduleChange(idx, 'theme', val)}
                      >
                        <SelectTrigger className="h-8 border-transparent bg-transparent shadow-none hover:bg-muted focus:ring-0 px-2 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_THEMES.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-11 sm:pl-0">
                    <span className="text-xs text-muted-foreground">Starts at</span>
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={(e) => handleScheduleChange(idx, 'time', e.target.value)}
                      className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none text-foreground font-medium focus:ring-2 focus:ring-ring"
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
                  value={themeConfig.darkStart}
                  onChange={(e) => handleTimeChange('darkStart', e.target.value)}
                  className="bg-transparent border-none outline-none text-foreground font-medium text-right focus:ring-0 min-w-[80px]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
