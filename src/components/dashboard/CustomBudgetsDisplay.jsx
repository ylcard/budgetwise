import { Card, CardContent } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import BudgetHealthCircular from "../custombudgets/BudgetHealthCircular";
import { useSettings } from "../utils/SettingsContext";
import useEmblaCarousel from 'embla-carousel-react';
import { useState, useCallback, useEffect } from "react";
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

  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="space-y-6 px-4 md:px-0">
      {budgets.length > 0 && (
        <Card className="border-none shadow-lg">
          <div className="px-3 pt-4 pb-0 flex flex-col items-center text-center md:flex-row md:justify-between md:px-6 md:pt-6">
            <h2 className="text-lg font-bold text-foreground">Custom Budgets</h2>
            <CustomButton
              variant="budget"
              onClick={onCreateBudget}
              className="hidden md:flex"
            >
              Custom Budgets
              <Plus />
            </CustomButton>
          </div>
          <CardContent className="pt-2 overflow-hidden">
            <motion.div
              layout
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="overflow-hidden w-full" ref={emblaRef}>
                <div
                  className={cn(
                    "flex touch-pan-y",
                    budgets.length < 2 && "sm:justify-center",
                    budgets.length < 3 && "md:justify-center",
                    budgets.length < 4 && "lg:justify-center"
                  )}
                >
                  {budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0"
                    >
                      <BudgetHealthCircular
                        budget={budget}
                        transactions={[]}
                        settings={settings}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {budgets.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-4">
                  {budgets.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${selectedIndex === index ? "w-4 bg-primary" : "w-1.5 bg-border"
                        }`}
                    />
                  ))}
                </div>
              )}
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
            <CustomButton
              variant="budget"
              onClick={onCreateBudget}
              className="min-w-[200px]"
            >
              <Plus />
              Create First Budget
            </CustomButton>
          </CardContent>
        </Card>
      )}
    </div>
  );
}