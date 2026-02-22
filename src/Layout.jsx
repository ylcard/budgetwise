import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, LogOut, ChevronLeft, MoreHorizontal, Moon, Sun, Ghost } from "lucide-react";
import { useMemo, useRef, useEffect, useState } from "react";
import { SettingsProvider, useSettings } from "./components/utils/SettingsContext";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import { navigationItems } from "./components/utils/navigationConfig";
import { TutorialProvider } from "./components/tutorial/TutorialContext"; // ADDED 15-Feb-2026: Tutorial system
import TutorialOverlay from "./components/tutorial/TutorialOverlay"; // ADDED 15-Feb-2026: Tutorial UI
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import NotificationCenter from "./components/notifications/NotificationCenter"; // ADDED 14-Feb-2026
import NotificationBell from "./components/notifications/NotificationBell"; // ADDED 14-Feb-2026
import PrivacyBanner from "./components/utils/PrivacyBanner"; // ADDED 14-Feb-2026: GPC/DNT support
import { initializePrivacySignals } from "./components/utils/privacySignals"; // ADDED 14-Feb-2026
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
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
import { Switch } from "@/components/ui/switch"; // Assuming you have this shadcn component
import { useTheme } from "next-themes";
import { BudgetAvatar } from "./components/ui/BudgetAvatar";
import { HealthProvider, useHealth } from "./components/utils/HealthContext";
import CookieBanner from "./components/cookies/CookieBanner";
import CookieSettings from "./components/cookies/CookieSettings";
import { useCookieConsent } from "./components/cookies/useCookieConsent";

const LayoutContent = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { logout } = useAuth();
    const { budgetHealth } = useHealth();
    const { settings, updateSettings } = useSettings();

    // Cookie Consent
    const { showBanner, consent, acceptAll, acceptNecessary, updateConsent } = useCookieConsent();
    const [showCookieSettings, setShowCookieSettings] = useState(false);

    const handleUpdateConsent = (newConsent) => {
        Object.keys(newConsent).forEach(key => {
            if (key !== 'essential') {
                updateConsent(key, newConsent[key]);
            }
        });
    };

    // ADDED 14-Feb-2026: Initialize privacy signal enforcement on mount
    useEffect(() => {
        initializePrivacySignals();
    }, []);

    // Helper to toggle theme
    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // ADDED 03-Feb-2026: Per-tab navigation history stacks for iOS-style tab navigation
    const navigationHistory = useRef({});
    const currentTab = useRef(null);

    // UPDATED 03-Feb-2026: Get current page title and determine if on root tab
    const primaryNav = navigationItems.slice(0, 4);
    const secondaryNav = navigationItems.slice(4);

    const { currentPageTitle, isRootPage, activeTab } = useMemo(() => {
        const pathname = location.pathname;

        // Recursive helper to find the active item
        const findItem = (items) => {
            for (const item of items) {
                // Check exact match or if it's a parent path
                if (item.url === pathname || pathname.startsWith(item.url + '/')) {
                    // Check children for specific match
                    if (item.items) {
                        const subItem = item.items.find(sub => sub.url === pathname);
                        if (subItem) return subItem;
                    }
                    return item;
                }
            }
            return null;
        };

        const route = findItem(navigationItems);
        const isRoot = navigationItems.some(item => item.url === pathname);

        return {
            currentPageTitle: route?.title || 'BudgetWise',
            isRootPage: isRoot || pathname === '/',
            activeTab: route?.url
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
            {/* ADDED 14-Feb-2026: Privacy signal banner (GPC/DNT) */}
            <PrivacyBanner />

            {/* Mobile-only fixed top header with dynamic back button (iOS native standard) */}
            <header className="md:hidden fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b border-border z-40 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="flex items-center justify-center h-14 px-4 relative">
                    {!isRootPage && (
                        <button
                            onClick={handleBackNavigation}
                            className="absolute left-4 flex items-center justify-center w-8 h-8 text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                            aria-label="Go back"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-lg font-semibold text-foreground truncate max-w-[60%]">{currentPageTitle}</h1>

                    {/* ADDED 14-Feb-2026: Notification Bell - Mobile Header */}
                    <div className="absolute right-4">
                        <NotificationCenter />
                    </div>
                </div>
            </header>

            <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <Sidebar className="hidden md:flex border-r border-border">
                    <SidebarHeader className="border-b border-border p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-foreground text-lg">BudgetWise</h2>
                                    <p className="text-xs text-muted-foreground">Personal Finance</p>
                                </div>
                            </div>
                            {/* ADDED 14-Feb-2026: Notification Bell - Desktop Sidebar */}
                            <NotificationCenter />
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="p-4 space-y-2">
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {navigationItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                className={`hover:bg-accent hover:text-accent-foreground transition-all duration-200 rounded-xl mb-1 ${location.pathname === item.url ? 'bg-accent/50 text-foreground font-semibold shadow-sm' : 'text-muted-foreground'
                                                    }`}
                                            >
                                                <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                                                    <item.icon className="w-5 h-5" />
                                                    <span className="font-medium">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                            {item.items && (
                                                <SidebarMenuSub>
                                                    {item.items.map((subItem) => (
                                                        <SidebarMenuSubItem key={subItem.url}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={location.pathname === subItem.url}
                                                            >
                                                                <Link to={subItem.url}>
                                                                    <span>{subItem.title}</span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            )}
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="p-3 border-t border-border">
                        {/* Desktop Mascot Toggle */}
                        <div
                            className="flex items-center justify-between w-full px-4 py-2 hover:bg-accent/50 rounded-md text-muted-foreground hover:text-foreground transition-colors mb-1 cursor-pointer select-none"
                            onClick={() => updateSettings({ showMascot: !settings.showMascot })}
                        >
                            <div className="flex items-center gap-3">
                                <Ghost className="w-5 h-5" />
                                <span className="font-medium">Casper</span>
                            </div>
                            <Switch checked={settings.showMascot} onCheckedChange={() => updateSettings({ showMascot: !settings.showMascot })} className="scale-75" />
                        </div>

                        {/* Desktop Theme Toggle */}
                        <CustomButton
                            variant="ghost"
                            className="w-full justify-start text-muted-foreground hover:text-foreground mb-1"
                            onClick={toggleTheme}
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
                            <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                        </CustomButton>

                        <CustomButton
                            variant="ghost"
                            className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => logout()}
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            <span className="font-medium">Logout</span>
                        </CustomButton>
                    </SidebarFooter>
                </Sidebar>

                <main className="flex-1 flex flex-col relative">
                    {/* Global Roaming Casper */}
                    {settings.showMascot && (
                        <BudgetAvatar health={budgetHealth} showText={false} isFloating={true} />
                    )}

                    <div className="flex-1 overflow-auto pt-14 md:pt-0 md:pb-0" style={{ paddingBottom: 'var(--nav-total-height)' }}>
                        <RouteTransition>
                            {children}
                        </RouteTransition>
                    </div>

                    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border z-40" style={{ paddingBottom: 'var(--safe-bottom-inset)', height: 'var(--nav-total-height)' }}>
                        <div className="flex w-full items-center px-2 py-2 select-none h-[var(--mobile-bottom-nav-height)]">
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
                                        className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-all min-w-0 rounded-lg ${isTabActive
                                            ? 'text-primary bg-primary/10'
                                            : 'text-muted-foreground hover:text-foreground'
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
                                        <div className="grid grid-cols-1 divide-y divide-border">
                                            {secondaryNav.map((item) => (
                                                <Link
                                                    key={item.title}
                                                    to={item.url}
                                                    onClick={() => setIsMoreMenuOpen(false)}
                                                    className="flex items-center gap-4 px-6 py-4 hover:bg-accent active:bg-accent/80 transition-colors"
                                                >
                                                    <item.icon className="w-5 h-5 text-muted-foreground" />
                                                    <span className="font-medium text-foreground">{item.title}</span>
                                                </Link>
                                            ))}

                                            {/* Mobile Mascot Toggle */}
                                            <div className="flex items-center justify-between px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <Ghost className="w-5 h-5 text-muted-foreground" />
                                                    <span className="font-medium text-foreground">Show Casper</span>
                                                </div>
                                                <Switch checked={settings.showMascot} onCheckedChange={() => updateSettings({ showMascot: !settings.showMascot })} />
                                            </div>

                                            {/* Mobile Theme Toggle */}
                                            <div className="flex items-center justify-between px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <Moon className="w-5 h-5 text-muted-foreground" />
                                                    <span className="font-medium text-foreground">Dark Mode</span>
                                                </div>
                                                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                                            </div>
                                            <button
                                                onClick={() => logout()}
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

            {/* Cookie Consent System */}
            <CookieBanner
                show={showBanner}
                onAcceptAll={acceptAll}
                onAcceptNecessary={acceptNecessary}
                onOpenSettings={() => setShowCookieSettings(true)}
            />
            <CookieSettings
                open={showCookieSettings}
                onOpenChange={setShowCookieSettings}
                consent={consent}
                onUpdateConsent={handleUpdateConsent}
            />
        </SidebarProvider>
    );
};

export default function Layout({ children }) {
    return (
        <SettingsProvider>
            <PeriodProvider>
                <HealthProvider>
                    <ConfirmDialogProvider>
                        <TutorialProvider>
                            <FABProvider>
                                <LayoutContent>{children}</LayoutContent>
                                <TutorialOverlay />
                            </FABProvider>
                        </TutorialProvider>
                    </ConfirmDialogProvider>
                </HealthProvider>
            </PeriodProvider>
        </SettingsProvider>
    );
}