
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
      { title: "Display", url: "/manage?group=app&tab=display" },
      { title: "Appearance", url: "/manage?group=app&tab=appearance" },
      { title: "Categories", url: "/manage?group=finance&tab=categories" },
      { title: "Automation", url: "/manage?group=finance&tab=automation" },
      { title: "Bank Sync", url: "/manage?group=finance&tab=banksync" },
      { title: "Account", url: "/manage?group=account&tab=profile" },
    ]
  },
  // Secondary Nav (Legal Pages)
  {
    title: "Legal",
    url: "/legal/privacy",
    icon: Shield,
  },
];