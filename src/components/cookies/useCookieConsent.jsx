import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'budgetwise_cookie_consent';

const defaultConsent = {
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    timestamp: null
};

export function useCookieConsent() {
    const [consent, setConsentState] = useState(() => {
        if (typeof window === 'undefined') return null;
        
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (err) {
            console.error('Failed to load cookie consent:', err);
        }
        
        return null; // No consent saved yet
    });

    const [showBanner, setShowBanner] = useState(consent === null);

    const saveConsent = useCallback((newConsent) => {
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
            console.error('Failed to save cookie consent:', err);
        }
    }, []);

    const acceptAll = useCallback(() => {
        saveConsent({
            essential: true,
            analytics: true,
            marketing: true
        });
    }, [saveConsent]);

    const acceptNecessary = useCallback(() => {
        saveConsent({
            essential: true,
            analytics: false,
            marketing: false
        });
    }, [saveConsent]);

    const updateConsent = useCallback((category, value) => {
        if (category === 'essential') return; // Cannot modify essential
        
        const newConsent = {
            ...consent,
            [category]: value
        };
        
        saveConsent(newConsent);
    }, [consent, saveConsent]);

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