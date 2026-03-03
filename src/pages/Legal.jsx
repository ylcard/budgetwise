import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, FileText, Cookie, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Import existing page components
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import CookiePolicy from "./CookiePolicy";
import FinancialDisclaimer from "./FinancialDisclaimer";

export default function LegalPage() {
    const { tab } = useParams();
    const navigate = useNavigate();

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
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const currentTab = tab || "privacy";

    return (
        <div className="flex flex-col w-full bg-muted/30">
            <Tabs
                value={currentTab}
                onValueChange={handleTabChange}
                className="w-full flex flex-col"
            >
                {/* Header Section (Not Sticky to fix layout bugs) */}
                <div className="w-full bg-background border-b border-border shadow-sm z-10">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 pt-4 pb-0">
                        {/* Desktop Title */}
                        <div className="hidden md:block mb-4">
                            <h1 className="text-2xl font-bold text-foreground">Legal Center</h1>
                            <p className="text-muted-foreground text-sm">Review our policies and terms</p>
                        </div>

                        <TabsList className="w-full h-auto flex justify-start overflow-x-auto no-scrollbar bg-transparent p-0 pb-3 gap-2 md:gap-4">
                            {tabItems.map((item) => (
                                <TabsTrigger
                                    key={item.id}
                                    value={item.id}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap",
                                        // Active: Dark text/border or specific brand color
                                        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                                        // Inactive: Simple gray
                                        "data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-border data-[state=inactive]:hover:bg-muted"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-5xl mx-auto">
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
        </div>
    );
}
