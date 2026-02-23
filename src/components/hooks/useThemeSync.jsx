import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { flushSync } from 'react-dom';

export function useThemeSync(userSettings) {
  const { setTheme, theme: currentTheme } = useTheme();

  const validateAndApplyTheme = useCallback(() => {
    // Defensive check: abort if settings aren't loaded yet
    if (!userSettings || !userSettings.themeConfig) return;

    // If user manually toggled the theme this session, pause enforcement
    if (sessionStorage.getItem('budgetwise_temp_theme') === 'true') {
      return;
    }

    const { mode, schedules } = userSettings.themeConfig;

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
        const [h, m] = s.time.split(':').map(Number);
        return { ...s, mins: h * 60 + m };
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
        sessionStorage.removeItem('budgetwise_temp_theme');
        validateAndApplyTheme();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [validateAndApplyTheme]);
}
