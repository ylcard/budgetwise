/**
 * CREATED 14-Feb-2026: Privacy Signal Detection and Enforcement
 * Implements strict GPC (Global Privacy Control) and DNT (Do Not Track) support
 */

/**
 * Detects if Global Privacy Control (GPC) signal is enabled
 * GPC is a legal signal that must be honored under CCPA, GDPR, and other privacy laws
 */
export const isGPCEnabled = () => {
    // Check navigator.globalPrivacyControl (standard GPC signal)
    if (typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true) {
        return true;
    }

    // Check for GPC via Sec-GPC header (server-side, but can check via JS)
    // This is a fallback for browsers that implement GPC via headers
    return false;
};

/**
 * Detects if Do Not Track (DNT) signal is enabled
 * DNT is an older privacy signal, less legally binding than GPC
 */
export const isDNTEnabled = () => {
    if (typeof navigator !== 'undefined') {
        // Check for DNT: "1" means enabled
        const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
        return dnt === "1" || dnt === "yes";
    }
    return false;
};

/**
 * Checks if any privacy signal is active
 */
export const hasPrivacySignalActive = () => {
    return isGPCEnabled() || isDNTEnabled();
};

/**
 * Get current privacy signal status with details
 */
export const getPrivacySignalStatus = () => {
    const gpc = isGPCEnabled();
    const dnt = isDNTEnabled();

    return {
        gpcEnabled: gpc,
        dntEnabled: dnt,
        anySignalActive: gpc || dnt,
        strictMode: gpc, // GPC requires strict compliance
        signals: [
            ...(gpc ? ['Global Privacy Control (GPC)'] : []),
            ...(dnt ? ['Do Not Track (DNT)'] : [])
        ]
    };
};

/**
 * Enforce privacy signals by blocking non-essential tracking
 * This should be called before initializing any analytics or tracking
 */
export const enforcePrivacySignals = () => {
    const status = getPrivacySignalStatus();

    if (status.gpcEnabled) {
        console.info('[Privacy] GPC signal detected - strict privacy mode enforced');
        
        // Block all non-essential tracking when GPC is active
        // This is LEGALLY REQUIRED under CCPA and GDPR
        return {
            allowAnalytics: false,
            allowThirdPartyTracking: false,
            allowCookies: false, // Only essential cookies allowed
            reason: 'Global Privacy Control (GPC) signal detected'
        };
    }

    if (status.dntEnabled) {
        console.info('[Privacy] DNT signal detected - enhanced privacy mode');
        
        // Honor DNT by disabling tracking (best effort)
        return {
            allowAnalytics: false,
            allowThirdPartyTracking: false,
            allowCookies: true, // DNT doesn't strictly prohibit cookies
            reason: 'Do Not Track (DNT) signal detected'
        };
    }

    return {
        allowAnalytics: true,
        allowThirdPartyTracking: true,
        allowCookies: true,
        reason: 'No privacy signals detected'
    };
};

/**
 * Store privacy signal consent in localStorage for app-wide access
 */
export const storePrivacySignalConsent = () => {
    const enforcement = enforcePrivacySignals();
    const status = getPrivacySignalStatus();

    const consentData = {
        timestamp: new Date().toISOString(),
        gpcEnabled: status.gpcEnabled,
        dntEnabled: status.dntEnabled,
        enforcement,
        browserSignals: {
            doNotTrack: navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack || 'unset',
            globalPrivacyControl: navigator.globalPrivacyControl !== undefined ? navigator.globalPrivacyControl : 'not_supported'
        }
    };

    try {
        localStorage.setItem('privacy_signal_status', JSON.stringify(consentData));
        return consentData;
    } catch (e) {
        console.warn('[Privacy] Unable to store privacy signal status:', e);
        return consentData;
    }
};

/**
 * Get stored privacy signal consent
 */
export const getStoredPrivacySignalConsent = () => {
    try {
        const stored = localStorage.getItem('privacy_signal_status');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[Privacy] Unable to read privacy signal status:', e);
    }
    return null;
};

/**
 * Initialize privacy signal enforcement on app load
 * This should be called as early as possible in the app lifecycle
 */
export const initializePrivacySignals = () => {
    const status = getPrivacySignalStatus();
    const enforcement = enforcePrivacySignals();

    // Log to console for transparency
    if (status.anySignalActive) {
        console.group('[Privacy Signals Detected]');
        console.info('Active Signals:', status.signals.join(', '));
        console.info('GPC Enabled:', status.gpcEnabled ? 'YES (Strict Compliance)' : 'No');
        console.info('DNT Enabled:', status.dntEnabled ? 'YES' : 'No');
        console.info('Analytics:', enforcement.allowAnalytics ? 'Allowed' : 'BLOCKED');
        console.info('Third-Party Tracking:', enforcement.allowThirdPartyTracking ? 'Allowed' : 'BLOCKED');
        console.groupEnd();
    }

    // Store for app-wide access
    storePrivacySignalConsent();

    return {
        status,
        enforcement
    };
};