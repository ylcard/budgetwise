import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { applyA11yTheme } from '@/components/utils/accessibilityThemes';

const SettingsContext = createContext();

const STORAGE_KEY = 'budgetwise_settings';

const getLocaleDefaults = () => {
    const locale = navigator.language || 'en-US';
    const numberFormat = new Intl.NumberFormat(locale);
    const parts = numberFormat.formatToParts(1000.1);

    const thousandSeparator = parts.find(p => p.type === 'group')?.value || ',';
    const decimalSeparator = parts.find(p => p.type === 'decimal')?.value || '.';
    const baseCurrency = Intl.NumberFormat().resolvedOptions().currency || 'USD';

    // Simple check for currency symbol
    const currencySymbol = new Intl.NumberFormat(locale, { style: 'currency', currency: baseCurrency })
        .formatToParts(1)
        .find(p => p.type === 'currency')?.value || '$';

    return {
        baseCurrency,
        currencySymbol,
        currencyPosition: 'before',
        thousandSeparator,
        decimalSeparator,
        decimalPlaces: 2,
        hideTrailingZeros: false,
        dateFormat: locale.startsWith('en-US') ? 'MMM dd, yyyy' : 'dd/MM/yyyy',
        budgetViewMode: 'bars',
        fixedLifestyleMode: false,
        barViewMode: true,
        goalMode: true,
        displayName: '',
        showMascot: true,
        tutorialsEnabled: true,
        completedTutorials: [],
        themeConfig: {
            mode: 'system',
            schedules: [
                { time: '08:00', theme: 'light' },
                { time: '20:00', theme: 'dark' }
            ]
        }
    };
};

const defaultSettings = getLocaleDefaults();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    const { user: authUser } = useAuth();

    // Load from localStorage immediately
    const [settings, setSettings] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = { ...defaultSettings, ...JSON.parse(stored) };
                // ADDED 11-Mar-2026: Apply a11y theme instantly from cache
                if (parsed.themeConfig?.a11yTheme) {
                    applyA11yTheme(parsed.themeConfig.a11yTheme);
                }
                return parsed;
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
        }
        return defaultSettings;
    });

    const [settingsId, setSettingsId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authUser) {
            loadSettings();
        }
    }, [authUser]);

    const loadSettings = async () => {
        try {
            // Filter by email directly to avoid fetching ALL user settings
            const userSettingsArray = await base44.entities.UserSettings.filter({ created_by: authUser.email });
            const userSettings = userSettingsArray[0];

            if (userSettings) {
                setSettingsId(userSettings.id);
                // ADDED 11-Mar-2026: Apply persisted accessibility theme on load
                if (userSettings.themeConfig?.a11yTheme) {
                    applyA11yTheme(userSettings.themeConfig.a11yTheme);
                }

                const newSettings = {
                    baseCurrency: userSettings.baseCurrency || 'USD',
                    currencySymbol: userSettings.currencySymbol || '$',
                    currencyPosition: userSettings.currencyPosition || 'before',
                    thousandSeparator: userSettings.thousandSeparator || ',',
                    decimalSeparator: userSettings.decimalSeparator || '.',
                    decimalPlaces: userSettings.decimalPlaces || 2,
                    hideTrailingZeros: userSettings.hideTrailingZeros ?? false,
                    dateFormat: userSettings.dateFormat || 'MMM dd, yyyy',
                    budgetViewMode: userSettings.budgetViewMode || 'bars',
                    fixedLifestyleMode: userSettings.fixedMode ?? false,
                    barViewMode: userSettings.barViewMode ?? true,
                    // goalAllocationMode: userSettings.goalAllocationMode || 'percentage',
                    // absoluteGoals: userSettings.absoluteGoals || { needs: 0, wants: 0, savings: 0 }
                    goalMode: userSettings.goalMode ?? true,
                    displayName: userSettings.displayName || '',
                    showMascot: userSettings.showMascot ?? settings.showMascot ?? true,
                    tutorialsEnabled: userSettings.tutorialsEnabled ?? true,
                    completedTutorials: userSettings.completedTutorials || [],
                    themeConfig: userSettings.themeConfig || defaultSettings.themeConfig
                };

                // Update state and localStorage
                setSettings(newSettings);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = async (newSettings) => {
        try {
            if (!authUser) {
                throw new Error('User not logged in');
            }

            // Update localStorage immediately
            const updatedSettings = { ...settings, ...newSettings };
            setSettings(updatedSettings);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));

            // Prepare payload for DB (Map frontend keys to DB keys)
            const dbPayload = {
                ...updatedSettings,
                fixedMode: updatedSettings.fixedLifestyleMode, // Map UI 'fixedLifestyleMode' to DB 'fixedMode'
                displayName: updatedSettings.displayName,
                showMascot: updatedSettings.showMascot
            };
            // Remove the UI-only key to be clean (optional, but good practice if DB is strict)
            delete dbPayload.fixedLifestyleMode;

            // --- DATABASE SYNC ---
            // Safety: Ensure we have an ID. If state is empty, fetch it one last time.
            let targetId = settingsId;

            if (!targetId && authUser?.email) {
                const existing = await base44.entities.UserSettings.filter({ created_by: authUser.email });
                if (existing && existing[0]) {
                    targetId = existing[0].id;
                    setSettingsId(targetId); // Update state for next time
                }
            }

            if (targetId) {
                // Trying to apply a bug fix for the fixed mode not saving
                // await base44.entities.UserSettings.update(targetId, updatedSettings);
                await base44.entities.UserSettings.update(targetId, dbPayload);
            } else if (authUser?.email) {
                // Only create if we genuinely couldn't find an existing record
                const created = await base44.entities.UserSettings.create({
                    ...updatedSettings, // CRITICAL: Use full, merged settings for creation
                    ...dbPayload,
                    created_by: authUser.email
                });
                if (created) setSettingsId(created.id);
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, user: authUser, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
};