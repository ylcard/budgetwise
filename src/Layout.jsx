import { Link, useLocation } from "react-router-dom";
import { Wallet } from "lucide-react";
import { SettingsProvider } from "./components/utils/SettingsContext";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import { navigationItems } from "./components/utils/navigationConfig";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { PeriodProvider } from "./components/hooks/usePeriod";

const LayoutContent = ({ children }) => {
    const location = useLocation();

    return (
        <SidebarProvider>
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
                </Sidebar>

                <main className="flex-1 flex flex-col relative">
                    <div className="flex-1 overflow-auto pt-20 md:pb-0">
                        {children}
                    </div>

                    {/* Mobile Top Navigation */}
                    <nav className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-[100] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                        <div className="flex w-full items-center px-1 py-2">
                            {navigationItems.map((item) => {
                                const isActive = location.pathname === item.url;
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
                    <LayoutContent>{children}</LayoutContent>
                </ConfirmDialogProvider>
            </PeriodProvider>
        </SettingsProvider>
    );
}
