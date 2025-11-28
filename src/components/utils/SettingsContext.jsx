import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SettingsContext = createContext();

const STORAGE_KEY = 'budgetwise_settings';

const defaultSettings = {
    baseCurrency: 'USD',
    currencySymbol: '$',
    currencyPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
    decimalPlaces: 2,
    hideTrailingZeros: false,
    dateFormat: 'MMM dd, yyyy',
    budgetViewMode: 'bars',
    fixedLifestyleMode: false,
    barViewMode: true,
    // goalAllocationMode: 'percentage', // 'percentage' or 'absolute'
    // absoluteGoals: { needs: 0, wants: 0, savings: 0 }, // Store absolute amounts
    goalMode: true // true = percentage, false = absolute
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    // Load from localStorage immediately
    const [settings, setSettings] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...defaultSettings, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
        }
        return defaultSettings;
    });

    const [user, setUser] = useState(null);
    const [settingsId, setSettingsId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);

            // Filter by email directly to avoid fetching ALL user settings
            const userSettingsArray = await base44.entities.UserSettings.filter({ user_email: currentUser.email });
            const userSettings = userSettingsArray[0];

            if (userSettings) {
                setSettingsId(userSettings.id);
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
                    goalMode: userSettings.goalMode ?? true
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
            if (!user) {
                throw new Error('User not logged in');
            }

            // Update localStorage immediately
            const updatedSettings = { ...settings, ...newSettings };
            setSettings(updatedSettings);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));

            // Prepare payload for DB (Map frontend keys to DB keys)
            const dbPayload = {
                ...updatedSettings,
                fixedMode: updatedSettings.fixedLifestyleMode // Map UI 'fixedLifestyleMode' to DB 'fixedMode'
            };
            // Remove the UI-only key to be clean (optional, but good practice if DB is strict)
            delete dbPayload.fixedLifestyleMode;

            // --- DATABASE SYNC ---
            // Safety: Ensure we have an ID. If state is empty, fetch it one last time.
            let targetId = settingsId;

            if (!targetId && user?.email) {
                const existing = await base44.entities.UserSettings.filter({ user_email: user.email });
                if (existing && existing[0]) {
                    targetId = existing[0].id;
                    setSettingsId(targetId); // Update state for next time
                }
            }

            if (targetId) {
                // Trying to apply a bug fix for the fixed mode not saving
                // await base44.entities.UserSettings.update(targetId, updatedSettings);
                await base44.entities.UserSettings.update(targetId, dbPayload);
            } else if (user?.email) {
                // Only create if we genuinely couldn't find an existing record
                const created = await base44.entities.UserSettings.create({
                    ...updatedSettings, // CRITICAL: Use full, merged settings for creation
                    ...dbPayload,
                    user_email: user.email
                });
                if (created) setSettingsId(created.id);
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, user, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
};