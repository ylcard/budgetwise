import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { flushSync } from 'react-dom';

const TEMP_THEME_KEY = 'budgetwise_temp_theme';

/**
 * Custom hook to synchronize the application theme with user settings.
 * Handles:
 * 1. Static theme application (light/dark/system).
 * 2. Scheduled theme changes based on time of day.
 * 3. View Transitions API integration for smooth theme switching.
 * 4. Visibility change handling to re-sync on app resume.
 *
 * @param {Object} userSettings - The user's settings object containing themeConfig.
 */
export function useThemeSync(userSettings) {
  const { setTheme, theme: currentTheme } = useTheme();

  const validateAndApplyTheme = useCallback(() => {
    // Defensive check: abort if settings aren't loaded yet
    if (!userSettings || !userSettings.themeConfig) return;

    const { mode, schedules } = userSettings.themeConfig || {};

    // If user manually toggled the theme this session, pause enforcement
    if (sessionStorage.getItem(TEMP_THEME_KEY) === 'true') {
      return;
    }

    const applyTheme = (newTheme) => {
      if (currentTheme === newTheme) return;

      const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isHidden = document.visibilityState === 'hidden';

      if (!document.startViewTransition || isReducedMotion || isHidden) {
        setTheme(newTheme);
        return;
      }

      document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme);
        });
      });
    };

    // 1. System or Specific Theme (All the time)
    if (mode !== 'scheduled') {
      applyTheme(mode);
      return;
    }

    // 2. Scheduled Configuration
    if (mode === 'scheduled' && Array.isArray(schedules) && schedules.length > 0) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Sort schedules by absolute minutes
      const sortedSchedules = [...schedules].map(s => {
        if (!s.time) return { ...s, mins: 0 };
        const [h, m] = s.time.split(':').map(n => parseInt(n, 10) || 0);
        return { ...s, mins: (h * 60) + m };
      }).sort((a, b) => a.mins - b.mins);

      // Find the active theme. Default to the LAST schedule of the day (wrap-around from previous night)
      let targetTheme = sortedSchedules[sortedSchedules.length - 1].theme;

      for (const schedule of sortedSchedules) {
        if (currentMinutes >= schedule.mins) {
          targetTheme = schedule.theme;
        } else {
          break; // Future schedule, stop checking
        }
      }

      applyTheme(targetTheme);
    }
  }, [userSettings, currentTheme, setTheme]);

  useEffect(() => {
    // 1. Run validation on mount or when settings update
    validateAndApplyTheme();

    // 2. Run validation when user switches back to the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear temporary manual override when app wakes up/is reopened
        sessionStorage.removeItem(TEMP_THEME_KEY);
        validateAndApplyTheme();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [validateAndApplyTheme]);
}
