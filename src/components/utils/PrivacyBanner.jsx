import { useEffect, useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPrivacySignalStatus } from './privacySignals';

/**
 * CREATED 14-Feb-2026: Privacy signal indicator banner
 * Displays when GPC or DNT signals are detected
 */
export default function PrivacyBanner() {
    const [status, setStatus] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const privacyStatus = getPrivacySignalStatus();
        if (privacyStatus.anySignalActive) {
            setStatus(privacyStatus);
            
            // Check if user has dismissed this session
            const dismissed = sessionStorage.getItem('privacy_banner_dismissed');
            if (dismissed) {
                setDismissed(true);
            }
        }
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('privacy_banner_dismissed', 'true');
    };

    if (!status?.anySignalActive || dismissed) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold">
                                {status.gpcEnabled && 'Global Privacy Control (GPC) Active'}
                                {!status.gpcEnabled && status.dntEnabled && 'Do Not Track (DNT) Active'}
                            </p>
                            <p className="text-blue-100 text-xs">
                                {status.gpcEnabled && 'Enhanced privacy mode enforced. Non-essential tracking disabled.'}
                                {!status.gpcEnabled && status.dntEnabled && 'Enhanced privacy mode. Tracking minimized where possible.'}
                            </p>
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-300 shrink-0" />
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-blue-100 hover:text-white underline shrink-0"
                    >
                        Dismiss
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}