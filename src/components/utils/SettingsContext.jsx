import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SettingsContext = createContext();

const STORAGE_KEY = 'budgetwise_settings';

const defaultSettings = {
  currencySymbol: '$',
  currencyCode: 'USD',
  currencyPosition: 'before',
  thousandSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
  hideTrailingZeros: false,
  dateFormat: 'MMM dd, yyyy'
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
        const parsed = JSON.parse(stored);
        // Ensure we have all required fields
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return defaultSettings;
  });
  
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const allSettings = await base44.entities.UserSettings.list();
      const userSettings = allSettings.find(s => s.user_email === currentUser.email);
      
      if (userSettings) {
        // Only use the fallback defaults if the field is truly undefined/null, not if it's an empty string
        const newSettings = {
          currencySymbol: userSettings.currencySymbol !== undefined && userSettings.currencySymbol !== null ? userSettings.currencySymbol : defaultSettings.currencySymbol,
          currencyCode: userSettings.currencyCode !== undefined && userSettings.currencyCode !== null ? userSettings.currencyCode : defaultSettings.currencyCode,
          currencyPosition: userSettings.currencyPosition !== undefined && userSettings.currencyPosition !== null ? userSettings.currencyPosition : defaultSettings.currencyPosition,
          thousandSeparator: userSettings.thousandSeparator !== undefined && userSettings.thousandSeparator !== null ? userSettings.thousandSeparator : defaultSettings.thousandSeparator,
          decimalSeparator: userSettings.decimalSeparator !== undefined && userSettings.decimalSeparator !== null ? userSettings.decimalSeparator : defaultSettings.decimalSeparator,
          decimalPlaces: userSettings.decimalPlaces !== undefined && userSettings.decimalPlaces !== null ? userSettings.decimalPlaces : defaultSettings.decimalPlaces,
          hideTrailingZeros: userSettings.hideTrailingZeros !== undefined && userSettings.hideTrailingZeros !== null ? userSettings.hideTrailingZeros : defaultSettings.hideTrailingZeros,
          dateFormat: userSettings.dateFormat !== undefined && userSettings.dateFormat !== null ? userSettings.dateFormat : defaultSettings.dateFormat
        };
        
        console.log('Loaded user settings from database:', newSettings);
        
        // Update state and localStorage
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } else {
        console.log('No user settings found in database, using defaults');
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
      
      console.log('Updating settings to:', updatedSettings);
      
      // Then sync to database
      const allSettings = await base44.entities.UserSettings.list();
      const userSettings = allSettings.find(s => s.user_email === user.email);
      
      if (userSettings) {
        await base44.entities.UserSettings.update(userSettings.id, newSettings);
        console.log('Settings updated in database');
      } else {
        await base44.entities.UserSettings.create({
          ...newSettings,
          user_email: user.email
        });
        console.log('Settings created in database');
      }
      
      // Reload settings to ensure consistency
      await loadSettings();
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