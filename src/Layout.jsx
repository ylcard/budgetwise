import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, LogOut, ChevronLeft, MoreHorizontal } from "lucide-react";
import { useMemo, useRef, useEffect, useState } from "react";
import { SettingsProvider } from "./components/utils/SettingsContext";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import { navigationItems } from "./components/utils/navigationConfig";
import { useRecurringProcessor } from "./components/hooks/useRecurringProcessor";
import { base44 } from "@/api/base44Client";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PeriodProvider } from "./components/hooks/usePeriod";
import { CustomButton } from "@/components/ui/CustomButton";
import { RouteTransition } from "@/components/ui/RouteTransition"; // ADDED 03-Feb-2026: For iOS-style page transitions
import { FABProvider, useFAB } from "./components/hooks/FABContext"; // ADDED 04-Feb-2026: For GlobalFAB management
import GlobalFAB from "@/components/ui/GlobalFAB"; // ADDED 04-Feb-2026: Floating Action Button

const LayoutContent = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    // ADDED 03-Feb-2026: Per-tab navigation history stacks for iOS-style tab navigation
    const navigationHistory = useRef({});
    const currentTab = useRef(null);

    // ADDED 17-Jan-2026: Trigger recurring transaction processing on app load
    useRecurringProcessor();

    // UPDATED 03-Feb-2026: Get current page title and determine if on root tab
    const primaryNav = navigationItems.slice(0, 4);
    const secondaryNav = navigationItems.slice(4);

    const { currentPageTitle, isRootPage, activeTab } = useMemo(() => {
        const route = navigationItems.find(item => location.pathname === item.url.split('?')[0]);
        const tabUrl = route?.url || navigationItems.find(item =>
            location.pathname.startsWith(item.url.split('?')[0])
        )?.url;

        return {
            currentPageTitle: route?.title || 'BudgetWise',
            isRootPage: !!route,
            activeTab: tabUrl
        };
    }, [location.pathname]);

    // ADDED 03-Feb-2026: Track navigation history per tab
    useEffect(() => {
        if (activeTab) {
            // Initialize history for this tab if it doesn't exist
            if (!navigationHistory.current[activeTab]) {
                navigationHistory.current[activeTab] = [];
            }

            // If switching tabs, save the new tab as current
            if (currentTab.current !== activeTab) {
                currentTab.current = activeTab;
            }

            // Add current path to this tab's history if it's not already the last entry
            const tabHistory = navigationHistory.current[activeTab];
            if (tabHistory[tabHistory.length - 1] !== location.pathname) {
                navigationHistory.current[activeTab] = [...tabHistory, location.pathname];
            }
        }
    }, [location.pathname, activeTab]);

    // ADDED 03-Feb-2026: Enhanced back button handler that respects tab history
    const handleBackNavigation = () => {
        if (activeTab && navigationHistory.current[activeTab]) {
            const tabHistory = navigationHistory.current[activeTab];

            // If there's history in this tab (more than current page), go back within tab
            if (tabHistory.length > 1) {
                // Remove current page from history
                navigationHistory.current[activeTab] = tabHistory.slice(0, -1);
                const previousPage = tabHistory[tabHistory.length - 2];
                navigate(previousPage);
            } else {
                // No history in this tab, use browser back
                navigate(-1);
            }
        } else {
            // Fallback to browser back
            navigate(-1);
        }
    };

    return (
        <SidebarProvider>
            {/* UPDATED 03-Feb-2026: Mobile-only fixed top header with dynamic back button (iOS native standard) */}
            <header className="md:hidden fixed top-0 left-0 right-0 bg-background border-b border-border z-[100] shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="flex items-center justify-center h-14 px-4 relative">
                    {!isRootPage && (
                        <button
                            onClick={handleBackNavigation}
                            className="absolute left-4 flex items-center justify-center w-8 h-8 text-foreground hover:bg-accent rounded-lg transition-colors"
                            aria-label="Go back"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-lg font-semibold text-foreground truncate max-w-[60%]">{currentPageTitle}</h1>
                </div>
            </header>

            <style>{`
              :root {
                --primary-50: #F0F9FF;
          --primary-100: #E0F2FE;
          --primary-500: #0EA5E9;
          --primary-600: #0284C7;
          --primary-700: #0369A1;
          --success: #10B981;
          --warning: #F59E0B;
          --error: #EF4444;
          --bg-subtle: #FAFAF9;
        }
      `}</style>
            <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <Sidebar className="hidden md:flex border-r border-gray-200">
                    <SidebarHeader className="border-b border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 text-lg">BudgetWise</h2>
                                <p className="text-xs text-gray-500">Personal Finance</p>
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="p-3">
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {navigationItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${location.pathname === item.url ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm' : ''
                                                    }`}
                                            >
                                                <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                                                    <item.icon className="w-5 h-5" />
                                                    <span className="font-medium">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="p-3 border-t border-gray-200">
                        <CustomButton
                            variant="ghost"
                            className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
                            onClick={() => base44.auth.logout()}
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            <span className="font-medium">Logout</span>
                        </CustomButton>
                    </SidebarFooter>
                </Sidebar>

                <main className="flex-1 flex flex-col relative">
                    {/* UPDATED 03-Feb-2026: Added top padding for mobile fixed header, bottom padding for iOS safe area */}
                    <div className="flex-1 overflow-auto pt-14 md:pt-0 md:pb-0 pb-[calc(4rem+env(safe-area-inset-bottom))]">
                        <RouteTransition>
                            {children}
                        </RouteTransition>
                    </div>

                    {/* COMMENTED OUT 03-Feb-2026: Moved mobile nav from top to bottom per iOS native standards
                    <nav className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-[100] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                        <div className="flex w-full items-center px-1 py-2">
                            {navigationItems.map((item) => {
                                // UPDATED: Use activeTab to support sub-page highlighting/resetting
                                const isTabActive = activeTab === item.url
                                return (
                                    <Link
                                        key={item.title}
                                        to={item.url}
                                        className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all duration-200 min-w-0 ${isActive
                                            ? 'text-blue-600 bg-blue-50/50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                        <span className={`text-[9px] sm:text-[10px] font-medium truncate max-w-full px-0.5 ${isActive ? 'font-semibold' : ''}`}>
                                            {item.title}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                    */}

                    {/* UPDATED 03-Feb-2026: Mobile Bottom Tab Bar with select-none for iOS native feel */}
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 z-[100]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                        <div className="flex w-full items-center px-2 py-2 select-none">
                            {primaryNav.map((item) => {
                                const isTabActive = activeTab === item.url;
                                return (
                                    <Link
                                        key={item.title}
                                        to={item.url}
                                        onClick={(e) => {
                                            if (isTabActive) {
                                                // If already active, reset this tab's history and go to root
                                                e.preventDefault(); // Stop default Link behavior to handle manually
                                                navigationHistory.current[item.url] = [item.url];
                                                navigate(item.url, { replace: true });
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                        className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-all min-w-0 ${isTabActive
                                            ? 'text-blue-600 bg-blue-50/50'
                                            : 'text-gray-400'
                                            }`}
                                    >
                                        <item.icon className={`w-6 h-6 ${isTabActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                        <span className="text-[10px] font-medium truncate w-full text-center px-1">
                                            {item.title}
                                        </span>
                                    </Link>
                                );
                            })}

                            {/* More Menu Trigger */}
                            {secondaryNav.length > 0 && (
                                <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
                                    <SheetTrigger asChild>
                                        <button className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-gray-400 min-w-0">
                                            <MoreHorizontal className="w-6 h-6" />
                                            <span className="text-[10px] font-medium">More</span>
                                        </button>
                                    </SheetTrigger>
                                    <SheetContent side="bottom" className="rounded-t-[20px] px-0 pb-10">
                                        <SheetHeader className="px-6 pb-4 border-b">
                                            <SheetTitle>More Options</SheetTitle>
                                        </SheetHeader>
                                        <div className="grid grid-cols-1 divide-y divide-gray-100">
                                            {secondaryNav.map((item) => (
                                                <Link
                                                    key={item.title}
                                                    to={item.url}
                                                    onClick={() => setIsMoreMenuOpen(false)}
                                                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                                >
                                                    <item.icon className="w-5 h-5 text-gray-500" />
                                                    <span className="font-medium text-gray-900">{item.title}</span>
                                                </Link>
                                            ))}
                                            <button
                                                onClick={() => base44.auth.logout()}
                                                className="flex items-center gap-4 px-6 py-4 text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="w-5 h-5" />
                                                <span className="font-medium">Logout</span>
                                            </button>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            )}
                        </div>
                    </nav>
                    {/* GlobalFAB now consumes context internally */}
                    <GlobalFAB />
                </main>
            </div>
        </SidebarProvider>
    );
};

export default function Layout({ children }) {
    return (
        <SettingsProvider>
            <PeriodProvider>
                <ConfirmDialogProvider>
                    <FABProvider>
                        <LayoutContent>{children}</LayoutContent>
                    </FABProvider>
                </ConfirmDialogProvider>
            </PeriodProvider>
        </SettingsProvider>
    );
}