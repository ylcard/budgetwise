
import { LayoutDashboard, Receipt, BarChart3, Settings } from "lucide-react";
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
        title: "Reports",
        url: createPageUrl("Reports"),
        icon: BarChart3,
    },
    {
        title: "Manage",
        url: createPageUrl("Manage"),
        icon: Settings,
    },
];
