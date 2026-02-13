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
    items: [
      { title: "History", url: "/transactions/history" },
      { title: "Recurring", url: "/transactions/recurring" },
    ]
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
    items: [
      { title: "Preferences", url: "/manage/preferences" },
      { title: "Categories", url: "/manage/categories" },
      { title: "Automation", url: "/manage/automation" },
      { title: "Bank Sync", url: "/manage/banksync" },
      { title: "Account", url: "/manage/account" },
    ]
  },
];
