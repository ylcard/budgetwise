
import { LayoutDashboard, Receipt, BarChart3, Settings, Shield, Target, BookOpen } from "lucide-react";
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
    title: "Goals",
    url: createPageUrl("Goals"),
    icon: Target,
  },
  {
    title: "Learn",
    url: createPageUrl("Learn"),
    icon: BookOpen,
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
  // Secondary Nav (Legal Pages)
  {
    title: "Legal",
    url: "/legal/privacy",
    icon: Shield,
  },
];
