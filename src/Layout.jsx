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
          <div className="flex-1 overflow-auto pb-20 md:pb-0">
            {children}
          </div>
          
          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center px-2 py-3 pb-safe-4">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-blue-600 scale-105'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
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