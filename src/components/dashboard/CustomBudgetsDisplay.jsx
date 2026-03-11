import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import BudgetHealthCircular from "../custombudgets/BudgetHealthCircular";
import { useSettings } from "../utils/SettingsContext";
// REMOVED 10-Mar-2026: usePeriod and useEnrichedCustomBudgets — data now passed from Dashboard
// This eliminates 2 separate DB calls (CustomBudget + Transaction) that were duplicating Dashboard fetches.
// import { usePeriod } from "../hooks/usePeriod";
// import { useEnrichedCustomBudgets } from "../hooks/useDerivedData";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils"
import { motion } from "framer-motion";

/**
 * CREATED: 03-Feb-2026
 * Renamed from BudgetBars to CustomBudgetsDisplay
 * UPDATED: 03-Feb-2026 - Now receives raw budgets + transactions, each view calculates its own stats
 * UPDATED: 03-Feb-2026 - Now self-fetches custom budgets for period and their transactions
 * Displays ONLY custom budgets (no system budgets) in various view modes
 * UPDATED: 09-Feb-2026 - Replaced manual height hook with Framer Motion for smooth height transitions
 * and cross-fading view modes.
 * UPDATED: 10-Mar-2026 - No longer self-fetches. Accepts budgets from parent to prevent 429s.
 */

export default function CustomBudgetsDisplay({
  onCreateBudget,
  budgets = [],
}) {
  const { settings } = useSettings();

  return (
    <div className="space-y-6">
      {budgets.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader className="relative flex flex-row items-center justify-end md:justify-between space-y-0 py-4 pr-6 min-h-[70px]">
            <div className="hidden md:flex items-center gap-3">
              <CustomButton
                variant="budget"
                className="rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-2 px-3 py-1 text-sm font-medium"
                onClick={onCreateBudget}
              >
                Custom Budgets
                <Plus className="w-4 h-4" />
              </CustomButton>
            </div>
          </CardHeader>
          <CardContent className="pt-4 overflow-hidden">
            <motion.div
              layout
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent
                  className={cn(
                    "items-stretch",
                    budgets.length < 2 && "sm:justify-center",
                    budgets.length < 3 && "md:justify-center",
                    budgets.length < 4 && "lg:justify-center"
                  )}
                >
                  {budgets.map((budget) => (
                    <CarouselItem
                      key={budget.id}
                      className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                    >
                      <BudgetHealthCircular
                        budget={budget}
                        transactions={[]}
                        settings={settings}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselDots />
              </Carousel>
            </motion.div>
          </CardContent>
        </Card>
      )}
      {budgets.length === 0 && (
        <Card className="border-2 border-dashed border-border bg-muted/30 shadow-sm hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Custom Budgets</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              You haven't set up any custom budgets for this month yet.
              Create one to track specific spending categories.
            </p>
            <CustomButton variant="primary" onClick={onCreateBudget} className="min-w-[200px] shadow-md hover:shadow-lg transition-shadow">
              <Plus className="w-4 h-4 mr-2" />
              Create First Budget
            </CustomButton>
          </CardContent>
        </Card>
      )}
    </div>
  );
}