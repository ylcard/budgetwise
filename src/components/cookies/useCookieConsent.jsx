import { useState, useCallback } from 'react';

/** @constant {string} Key used for localStorage persistence */
const STORAGE_KEY = 'budgetwise_cookie_consent';

/**
 * Hook to manage cookie consent state and persistence.
 * Enforces 'essential' cookies as always active for app functionality.
 * @returns {Object} { consent, showBanner, acceptAll, acceptNecessary, updateConsent, resetConsent, hasConsent }
 */
export function useCookieConsent() {
  const [consent, setConsentState] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error('BudgetWise: Failed to load cookie consent:', err);
    }

    return null; // No consent saved yet
  });

  const [showBanner, setShowBanner] = useState(consent === null);

  /**
   * Internal helper to persist consent data with a high-precision timestamp.
   * @param {Object} newConsent 
   * @private
   */
  const saveConsent = useCallback((newConsent) => {
    // Using standard ISO string for precise audit trail requirements
    const consentData = {
      ...newConsent,
      essential: true, // Always enforce essential
      timestamp: new Date().toISOString()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
      setConsentState(consentData);
      setShowBanner(false);
    } catch (err) {
      console.error('BudgetWise: Failed to save cookie consent:', err);
    }
  }, []);

  /**
   * Grants consent for all cookie categories.
   */
  const acceptAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true
    });
  }, [saveConsent]);

  /**
   * Grants consent only for strictly necessary cookies.
   */
  const acceptNecessary = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false
    });
  }, [saveConsent]);

  /**
   * Updates a specific consent category.
   * @param {'analytics'|'marketing'} category 
   * @param {boolean} value 
   */
  const updateConsent = useCallback((category, value) => {
    if (category === 'essential') return; // Cannot modify essential

    const newConsent = {
      ...consent,
      [category]: value
    };

    saveConsent(newConsent);
  }, [consent, saveConsent]);

  /**
   * Clears all consent data and prompts the banner again.
   */
  const resetConsent = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setConsentState(null);
      setShowBanner(true);
    } catch (err) {
      console.error('Failed to reset cookie consent:', err);
    }
  }, []);

  return {
    consent,
    showBanner,
    acceptAll,
    acceptNecessary,
    updateConsent,
    resetConsent,
    hasConsent: consent !== null
  };
}