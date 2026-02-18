import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Wrench, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ensureBudgetsForActiveMonths, reconcileTransactionBudgets } from "@/components/utils/budgetInitialization";

/**
 * @component BudgetRepairCard
 * @description UI component to trigger system budget restoration and transaction reconciliation.
 */
export const BudgetRepairCard = ({ userEmail, budgetGoals, settings }) => {
    const [isRepairing, setIsRepairing] = useState(false);

    const handleRepair = async () => {
        if (!userEmail) {
            toast.error("User email is required for repair");
            return;
        }

        setIsRepairing(true);
        const toastId = toast.loading("Repairing budgets and links...");

        try {
            // Step 1: Restore missing budgets for any month that has transactions
            // This fixes the "deleted by accident" issue
            await ensureBudgetsForActiveMonths(userEmail, budgetGoals, settings);
            
            // Step 2: Link orphaned transactions to the newly created/existing budgets
            const updatedCount = await reconcileTransactionBudgets(userEmail);

            toast.success("Repair complete", {
                id: toastId,
                description: updatedCount > 0 
                    ? `Restored budgets and re-linked ${updatedCount} transactions.`
                    : "Budgets restored. No orphaned transactions found.",
            });
        } catch (error) {
            console.error("Repair failed:", error);
            toast.error("Repair failed", {
                id: toastId,
                description: "Check console for details.",
            });
        } finally {
            setIsRepairing(false);
        }
    };

    return (
        <Card className="border-dashed border-2">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Budget Maintenance</CardTitle>
                </div>
                <CardDescription>
                    Use this to restore accidentally deleted system budgets and fix orphaned transactions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={handleRepair}
                    disabled={isRepairing}
                >
                    {isRepairing ? (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Repairing...
                        </>
                    ) : (
                        "Run Budget Repair"
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};
