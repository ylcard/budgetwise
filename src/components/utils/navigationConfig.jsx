
import { LayoutDashboard, Receipt, BarChart3, Settings, Shield, FileText, AlertTriangle, Cookie } from "lucide-react";
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
    title: "Privacy",
    url: createPageUrl("PrivacyPolicy"),
    icon: Shield,
  },
  {
    title: "Terms",
    url: createPageUrl("TermsOfService"),
    icon: FileText,
  },
  {
    title: "Disclaimer",
    url: createPageUrl("FinancialDisclaimer"),
    icon: AlertTriangle,
  },
  {
    title: "Cookies",
    url: createPageUrl("CookiePolicy"),
    icon: Cookie,
  },
];
