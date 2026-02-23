import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';

export function useThemeSync(userSettings) {
    const { setTheme, theme: currentTheme } = useTheme();

    const validateAndApplyTheme = useCallback(() => {
        // Defensive check: abort if settings aren't loaded yet
        if (!userSettings || !userSettings.themeConfig) return;

        const { mode, lightStart, darkStart } = userSettings.themeConfig;

        // Pass-through for standard modes
        if (mode === 'light' || mode === 'dark' || mode === 'system') {
            if (currentTheme !== mode) setTheme(mode);
            return;
        }

        // Logic for 'scheduled' mode
        if (mode === 'scheduled' && lightStart && darkStart) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const parseTime = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const lightMins = parseTime(lightStart);
            const darkMins = parseTime(darkStart);

            let targetTheme = 'dark'; // Default to dark

            if (lightMins < darkMins) {
                // Standard day schedule (e.g., 08:00 to 20:00)
                if (currentMinutes >= lightMins && currentMinutes < darkMins) {
                    targetTheme = 'light';
                }
            } else {
                // Night shift schedule (e.g., light at 10:00, dark at 02:00)
                if (currentMinutes >= lightMins || currentMinutes < darkMins) {
                    targetTheme = 'light';
                }
            }

            if (currentTheme !== targetTheme) {
                setTheme(targetTheme);
            }
        }
    }, [userSettings, currentTheme, setTheme]);

    useEffect(() => {
        // 1. Run validation on mount or when settings update
        validateAndApplyTheme();

        // 2. Run validation when user switches back to the app
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                validateAndApplyTheme();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [validateAndApplyTheme]);
}
