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
        navigate(`/legal/${value}`);
        // Scroll to top when switching tabs
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const currentTab = tab || "privacy";

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50">
            <Tabs 
                value={currentTab} 
                onValueChange={handleTabChange} 
                className="w-full flex-1 flex flex-col"
            >
                {/* Sticky Tab Header */}
                <div className="sticky top-[var(--header-total-height)] z-30 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 py-2">
                        <TabsList className="w-full h-auto flex justify-start overflow-x-auto no-scrollbar bg-transparent p-0 gap-2 md:gap-4">
                            {tabItems.map((item) => (
                                <TabsTrigger
                                    key={item.id}
                                    value={item.id}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-full border border-transparent transition-all",
                                        "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200",
                                        "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-100",
                                        "whitespace-nowrap"
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
                <div className="flex-1">
                    {tabItems.map((item) => (
                        <TabsContent key={item.id} value={item.id} className="m-0 mt-0">
                            {/* We render the component directly. 
                               Since the original pages have their own padding/containers,
                               we just mount them here.
                            */}
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <item.component />
                            </div>
                        </TabsContent>
                    ))}
                </div>
            </Tabs>
        </div>
    );
}
