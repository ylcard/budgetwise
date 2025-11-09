import React, { createContext, useContext, useState, useEffect } from 'react';
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
        return { ...defaultSettings, ...JSON.parse(stored) };
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
        const newSettings = {
          baseCurrency: userSettings.baseCurrency || 'USD',
          currencySymbol: userSettings.currencySymbol || '$',
          currencyPosition: userSettings.currencyPosition || 'before',
          thousandSeparator: userSettings.thousandSeparator || ',',
          decimalSeparator: userSettings.decimalSeparator || '.',
          decimalPlaces: userSettings.decimalPlaces || 2,
          hideTrailingZeros: userSettings.hideTrailingZeros || false,
          dateFormat: userSettings.dateFormat || 'MMM dd, yyyy'
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
      
      // Then sync to database
      const allSettings = await base44.entities.UserSettings.list();
      const userSettings = allSettings.find(s => s.user_email === user.email);
      
      if (userSettings) {
        await base44.entities.UserSettings.update(userSettings.id, newSettings);
      } else {
        await base44.entities.UserSettings.create({
          ...newSettings,
          user_email: user.email
        });
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