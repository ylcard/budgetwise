import { useRef, useCallback, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, FileText, Cookie, AlertTriangle } from "lucide-react";
import LegalSegmentedControl from "@/components/legal/LegalSegmentedControl";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { motion, AnimatePresence } from "framer-motion";

// Import existing page components
import PrivacyPolicy from "./PrivacyPolicy";

const TermsOfService = lazy(() => import("./TermsOfService"));
const CookiePolicy = lazy(() => import("./CookiePolicy"));
const FinancialDisclaimer = lazy(() => import("./FinancialDisclaimer"));

const TAB_CONFIG = [
    { value: "privacy", icon: <Shield className="w-3.5 h-3.5" />, text: "Privacy", component: PrivacyPolicy },
    { value: "terms", icon: <FileText className="w-3.5 h-3.5" />, text: "Terms", component: TermsOfService },
    { value: "cookies", icon: <Cookie className="w-3.5 h-3.5" />, text: "Cookies", component: CookiePolicy },
    { value: "disclaimer", icon: <AlertTriangle className="w-3.5 h-3.5" />, text: "Disclaimer", component: FinancialDisclaimer },
];

export default function LegalPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const legalScrollRef = useRef(null);

    const currentTab = searchParams.get("tab") || "privacy";

    useEffect(() => {
        if (!searchParams.get("tab")) {
            setSearchParams({ tab: "privacy" }, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleTabChange = useCallback((value) => {
        setSearchParams({ tab: value }, { replace: true });
        legalScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, [setSearchParams]);

    return (
        <div ref={legalScrollRef} className="h-[calc(100vh-var(--header-total-height)-var(--nav-total-height))] w-full overflow-y-auto overflow-x-hidden bg-muted/30 scroll-smooth">

            {/* Sticky Header */}
            <div className="w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-sm z-20 sticky top-0">
                <div className="max-w-4xl mx-auto px-3 md:px-8 pt-3 md:pt-4 pb-2.5 md:pb-3">
                    {/* Desktop Title */}
                    <div className="hidden md:block mb-4">
                        <h1 className="text-2xl font-bold text-foreground">Legal Center</h1>
                        <p className="text-muted-foreground text-sm">Review our policies and terms</p>
                    </div>

                    <LegalSegmentedControl
                        options={TAB_CONFIG}
                        value={currentTab}
                        onChange={handleTabChange}
                    />
                </div>
            </div>

            {/* Content Area — all tabs stay mounted, only the active one is visible */}
            <div className="w-full max-w-4xl mx-auto pb-32 px-0">
                <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Loading policy...</div>}>
                    <AnimatePresence mode="wait">
                        {TAB_CONFIG.map((item) => (
                            currentTab === item.value && (
                                <motion.div
                                    key={item.value}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                >
                                    <item.component />
                                </motion.div>
                            )
                        ))}
                    </AnimatePresence>
                </Suspense>
            </div>

            <ScrollToTopButton scrollRef={legalScrollRef} />
        </div>
    );
}