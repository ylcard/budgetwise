/**
 * UPDATED 12-Mar-2026: Simplified. The mode segmented control and scheduled editor
 * have been moved into StyleThemePicker (unified mode + style theme picker).
 * This component now just orchestrates StyleThemePicker + AccessibilityThemePicker
 * and handles live preview + revert-on-unmount.
 */
import { useEffect } from 'react';
import AccessibilityThemePicker from './AccessibilityThemePicker';
import { applyA11yTheme } from '@/components/utils/accessibilityThemes';
import StyleThemePicker, { applyStyleTheme } from './StyleThemePicker';

// COMMENTED OUT 12-Mar-2026: Old imports no longer needed after removing segmented mode control
// import { Sun, Moon, Monitor, Clock } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { clsx } from 'clsx';
// import { twMerge } from 'tailwind-merge';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper to determine which scheduled theme is active right now
const getActiveScheduledTheme = (schedules) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const sorted = [...schedules].sort((a, b) => {
    const [aH, aM] = a.time.split(':').map(Number);
    const [bH, bM] = b.time.split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });

  if (sorted.length === 0) return 'light';

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
  applyStyleTheme(config.styleTheme || 'none');

  const root = window.document.documentElement;
  const hasStyleThemeOverride = config.styleTheme && config.styleTheme !== 'none';
  let isDark = false;

  if (hasStyleThemeOverride) {
    // Style themes like cyberpunk force dark mode
    isDark = true;
  } else if (config.mode === 'dark') {
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
  const currentConfig = themeConfig || { mode: 'system', styleTheme: 'none', a11yTheme: 'none' };

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

  const handleA11yThemeChange = (themeId) => {
    onChange({ ...currentConfig, a11yTheme: themeId });
  };

  // COMMENTED OUT 12-Mar-2026: Individual handlers no longer needed — StyleThemePicker handles mode+style in one onChange
  // const handleModeChange = (newMode) => { ... };
  // const handleStyleThemeChange = (themeId) => { ... };
  // const handleScheduleChange = (index, field, value) => { ... };
  // const handleTimeChange = (field, value) => { ... };
  // const handleCancel = () => { ... };

  return (
    <div className="space-y-6">
      {/* Unified mode + style theme picker with preview cards */}
      <StyleThemePicker
        themeConfig={currentConfig}
        onChange={onChange}
      />

      {/* Accessibility theme picker */}
      <div className="pt-2 border-t border-border">
        <AccessibilityThemePicker
          value={currentConfig.a11yTheme || 'none'}
          onChange={handleA11yThemeChange}
        />
      </div>
    </div>
  );
}