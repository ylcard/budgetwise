import { useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
// COMMENTED OUT 12-Mar-2026: Replaced Tabs with SegmentedControl to fix mobile overflow
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, FileText, Cookie, AlertTriangle } from "lucide-react";
// COMMENTED OUT 12-Mar-2026: No longer needed after removing Tabs
// import { cn } from "@/lib/utils";
// COMMENTED OUT 12-Mar-2026: Replaced shared SegmentedControl with isolated LegalSegmentedControl
// import { SegmentedControl } from "@/components/ui/SegmentedControl";
import LegalSegmentedControl from "@/components/legal/LegalSegmentedControl";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";

// Import existing page components
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import CookiePolicy from "./CookiePolicy";
import FinancialDisclaimer from "./FinancialDisclaimer";

const TAB_CONFIG = [
  { value: "privacy",    icon: <Shield className="w-3.5 h-3.5" />,        text: "Privacy",    component: PrivacyPolicy },
  { value: "terms",      icon: <FileText className="w-3.5 h-3.5" />,      text: "Terms",      component: TermsOfService },
  { value: "cookies",    icon: <Cookie className="w-3.5 h-3.5" />,        text: "Cookies",    component: CookiePolicy },
  { value: "disclaimer", icon: <AlertTriangle className="w-3.5 h-3.5" />, text: "Disclaimer", component: FinancialDisclaimer },
];

export default function LegalPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const legalScrollRef = useRef(null);

  const currentTab = tab || "privacy";

  // Redirect to default tab if none specified
  useEffect(() => {
    if (!tab) {
      navigate("/legal/privacy", { replace: true });
    }
  }, [tab, navigate]);

  // Handle tab switching
  const handleTabChange = (value) => {
    navigate(`/legal/${value}`, { replace: true });
    legalScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Resolve active component
  const ActiveComponent = useMemo(() => {
    const match = TAB_CONFIG.find((t) => t.value === currentTab);
    return match ? match.component : PrivacyPolicy;
  }, [currentTab]);

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

      {/* Content Area */}
      <div className="w-full max-w-4xl mx-auto pb-32 px-0">
        <ActiveComponent />
      </div>

      <ScrollToTopButton scrollRef={legalScrollRef} />
    </div>
  );
}