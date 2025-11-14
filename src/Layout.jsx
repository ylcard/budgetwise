import React from "react";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";

const LayoutContent = React.memo(({ children }) => {
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
        <Sidebar className="border-r border-gray-200">
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
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm' : ''
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

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-bold">BudgetWise</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
});

LayoutContent.displayName = 'LayoutContent';

export default function Layout({ children, currentPageName }) {
  return (
    <SettingsProvider>
      <ConfirmDialogProvider>
        <LayoutContent>{children}</LayoutContent>
      </ConfirmDialogProvider>
    </SettingsProvider>
  );
}

// UPDATED 15-Jan-2025: Integrated ConfirmDialogProvider into Layout
// This provides global access to the custom confirmation dialog across the entire app
// All components can now use the useConfirm() hook to trigger confirmations
// The provider wraps LayoutContent to ensure all pages have access to the confirmation functionality