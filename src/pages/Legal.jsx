import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, FileText, Cookie, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import ScrollToTopButton from "../components/ui/ScrollToTopButton";

// Import existing page components
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import CookiePolicy from "./CookiePolicy";
import FinancialDisclaimer from "./FinancialDisclaimer";

export default function LegalPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const legalScrollRef = useRef(null);

  // Configuration for the tabs
  const tabItems = [
    {
      id: "privacy",
      label: "Privacy",
      icon: Shield,
      component: PrivacyPolicy
    },
    {
      id: "terms",
      label: "Terms",
      icon: FileText,
      component: TermsOfService
    },
    {
      id: "cookies",
      label: "Cookies",
      icon: Cookie,
      component: CookiePolicy
    },
    {
      id: "disclaimer",
      label: "Disclaimer",
      icon: AlertTriangle,
      component: FinancialDisclaimer
    },
  ];

  // Redirect to default tab if none specified
  useEffect(() => {
    if (!tab) {
      navigate("/legal/privacy", { replace: true });
    }
  }, [tab, navigate]);

  // Handle tab switching
  const handleTabChange = (value) => {
    // Use replace to avoid history stack buildup
    navigate(`/legal/${value}`, { replace: true });

    // Optional: scroll top of content
    legalScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const currentTab = tab || "privacy";

  return (
    <div ref={legalScrollRef} className="h-[calc(100vh-var(--header-total-height)-var(--nav-total-height))] w-full overflow-y-auto overflow-x-hidden bg-muted/30 scroll-smooth">
      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full flex flex-col"
      >
        {/* Header Section — sticky on mobile so tabs remain accessible while scrolling long legal text */}
        <div className="w-full bg-background/95 backdrop-blur-sm border-b border-border shadow-sm z-20 sticky top-0">
          <div className="max-w-4xl mx-auto px-3 md:px-8 pt-3 md:pt-4 pb-0">
            {/* Desktop Title */}
            <div className="hidden md:block mb-4">
              <h1 className="text-2xl font-bold text-foreground">Legal Center</h1>
              <p className="text-muted-foreground text-sm">Review our policies and terms</p>
            </div>

            <TabsList className="w-full h-auto flex justify-start overflow-x-auto no-scrollbar bg-transparent p-0 pb-2.5 md:pb-3 gap-1.5 md:gap-4">
              {tabItems.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className={cn(
                    "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-medium transition-all whitespace-nowrap shrink-0",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                    "data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-border data-[state=inactive]:hover:bg-muted"
                  )}
                >
                  <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full max-w-5xl mx-auto pb-32 px-0">
          {tabItems.map((item) => (
            <TabsContent
              key={item.id}
              value={item.id}
              className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Render component directly */}
              <item.component />
            </TabsContent>
          ))}
        </div>
      </Tabs>
      <ScrollToTopButton scrollRef={legalScrollRef} />
    </div>
  );
}