
import { LayoutDashboard, Receipt, FolderOpen, BarChart3, Calendar, Settings, RefreshCw, Building2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Transactions",
    url: createPageUrl("Transactions"),
    icon: Receipt,
  },
  {
    title: "Recurring",
    url: createPageUrl("RecurringTransactions"),
    icon: RefreshCw,
  },
  {
    title: "Budgets",
    url: createPageUrl("Budgets"),
    icon: Calendar,
  },
  {
    title: "Categories",
    url: createPageUrl("Categories"),
    icon: FolderOpen,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
  },
  {
    title: "Bank Sync",
    url: createPageUrl("BankSync"),
    icon: Building2,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];
