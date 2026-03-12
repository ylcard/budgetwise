/**
 * ManageSegmentedControl — Full-width segmented control for the Manage page (mobile only).
 * CREATED 12-Mar-2026
 * Navigates between Manage sub-routes: Preferences, Categories, Automation, Bank Sync, Account.
 */
import React, { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, LayoutGroup } from "framer-motion";
import { SlidersHorizontal, Tag, Zap, Landmark, UserCog } from "lucide-react";

const MANAGE_TABS = [
  { value: "preferences", text: "Prefs",       icon: SlidersHorizontal },
  { value: "categories",  text: "Categories",  icon: Tag },
  { value: "automation",  text: "Rules",       icon: Zap },
  { value: "banksync",    text: "Bank",        icon: Landmark },
  { value: "account",     text: "Account",     icon: UserCog },
];

const ManageSegmentedControl = React.memo(() => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Derive active tab from current URL
  const activeTab = MANAGE_TABS.find((t) => pathname.endsWith(t.value))?.value || "preferences";

  const handleChange = useCallback((value) => {
    navigate(`/manage/${value}`, { replace: true });
  }, [navigate]);

  return (
    <LayoutGroup id="manage-seg">
      <div className="w-full rounded-lg bg-muted p-1 flex gap-0.5">
        {MANAGE_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => handleChange(tab.value)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium rounded-md transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="manage-seg-pill"
                  className="absolute inset-0 bg-background rounded-md shadow-sm"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon className="w-3.5 h-3.5" />
                {tab.text}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
});

ManageSegmentedControl.displayName = "ManageSegmentedControl";

export default ManageSegmentedControl;