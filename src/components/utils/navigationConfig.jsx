
import { LayoutDashboard, Receipt, FolderOpen, BarChart3, Calendar, Settings, RefreshCw, Link2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export const navigationItems = [
    // Primary Nav (Items 1-4)
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
        title: "Settings",
        url: createPageUrl("Settings"),
        icon: Settings,
    },
    // Secondary Nav (Moved to "More" menu)
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
        title: "Automation",
        url: createPageUrl("Automation"),
        icon: RefreshCw,
    },
    {
        title: "Bank Sync",
        url: createPageUrl("BankSync"),
        icon: Link2,
    },
];
