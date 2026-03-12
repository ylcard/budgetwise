/**
 * CREATED 11-Mar-2026: Style / cosmetic theme picker.
 * UPDATED 12-Mar-2026: Unified mode + style picker with preview cards.
 *   Now handles light/dark/system/scheduled mode AND cosmetic style themes
 *   in a single grid. Replaces the separate segmented mode control in AppearanceSettings.
 *   When "Scheduled" is selected, a schedule editor appears below the grid.
 */
import { memo, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThemePreviewCard from './ThemePreviewCard';

/**
 * Each entry defines a card in the grid.
 * `mode` — the appearance mode to set on config (light/dark/system/scheduled).
 * `styleTheme` — the style theme value ('none' for default, 'cyberpunk', etc.).
 * `paletteId` — which hardcoded palette to render in the preview.
 * `variant` — ThemePreviewCard layout variant (standard/split/scheduled).
 */
export const UNIFIED_THEMES = [
  { id: 'system',    label: 'System',    mode: 'system',    styleTheme: 'none',      paletteId: 'light', variant: 'split' },
  { id: 'light',     label: 'Light',     mode: 'light',     styleTheme: 'none',      paletteId: 'light', variant: 'standard' },
  { id: 'dark',      label: 'Dark',      mode: 'dark',      styleTheme: 'none',      paletteId: 'dark',  variant: 'standard' },
  { id: 'cyberpunk', label: 'Cyberpunk', mode: 'dark',      styleTheme: 'cyberpunk', paletteId: 'cyberpunk', variant: 'standard' },
  { id: 'scheduled', label: 'Scheduled', mode: 'scheduled', styleTheme: 'none',      paletteId: 'light', variant: 'scheduled' },
];

/** Available themes for the schedule dropdowns */
const SCHEDULE_THEME_OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/**
 * Applies or removes the cosmetic style theme on <html>.
 * @param {string} themeId
 */
export function applyStyleTheme(themeId) {
  const root = document.documentElement;
  if (!themeId || themeId === 'none') {
    root.removeAttribute('data-style-theme');
  } else {
    root.setAttribute('data-style-theme', themeId);
  }
}

/**
 * Resolves which card ID is currently active based on config values.
 */
const resolveActiveId = (config) => {
  const mode = config?.mode || 'system';
  const styleTheme = config?.styleTheme || 'none';

  // If a cosmetic style theme is active, match directly by styleTheme
  if (styleTheme && styleTheme !== 'none') {
    const match = UNIFIED_THEMES.find(t => t.styleTheme === styleTheme);
    if (match) return match.id;
  }

  // Otherwise match by mode
  return mode;
};

const StyleThemePicker = memo(function StyleThemePicker({
  themeConfig,
  onChange,
}) {
  const currentConfig = themeConfig || { mode: 'system', styleTheme: 'none' };
  const activeId = resolveActiveId(currentConfig);
  const defaultSchedules = [{ time: '08:00', theme: 'light' }, { time: '20:00', theme: 'dark' }];

  const handleSelect = useCallback((theme) => {
    onChange({
      ...currentConfig,
      mode: theme.mode,
      styleTheme: theme.styleTheme,
      // Preserve schedules when switching to/from scheduled mode
      schedules: currentConfig.schedules || defaultSchedules,
    });
  }, [currentConfig, onChange]);

  const handleScheduleChange = useCallback((index, field, value) => {
    const schedules = [...(currentConfig.schedules || defaultSchedules)];
    schedules[index] = { ...schedules[index], [field]: value };
    onChange({ ...currentConfig, schedules });
  }, [currentConfig, onChange]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Appearance</h3>
        <p className="text-xs text-muted-foreground">Choose how your app looks</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {UNIFIED_THEMES.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            label={theme.label}
            isActive={activeId === theme.id}
            onClick={() => handleSelect(theme)}
            paletteId={theme.paletteId}
            variant={theme.variant}
          />
        ))}
      </div>

      {/* Schedule editor — shown only when "Scheduled" is active */}
      <AnimatePresence>
        {currentConfig.mode === 'scheduled' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-3">
              <p className="text-xs text-muted-foreground font-medium">
                Set which theme activates at what time:
              </p>
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
                        {SCHEDULE_THEME_OPTIONS.map(t => (
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default StyleThemePicker;