import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { CustomButton } from "@/components/ui/CustomButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShieldAlert, Search, CheckCircle, Wrench, AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { useSettings } from '../utils/SettingsContext';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../hooks/queryKeys';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/currencyUtils';
import { fetchWithRetry } from '../utils/generalUtils';

export function AdminConsistencyChecker({ transactions }) {
    const { user, settings } = useSettings();
    const isMobile = useIsMobile();
    const queryClient = useQueryClient();

    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [anomalies, setAnomalies] = useState([]);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    const analyze = async () => {
        setIsAnalyzing(true);
        setHasAnalyzed(false);
        try {
            // Fetch ONLY system budgets directly from DB
            const sysBudgets = await fetchWithRetry(() => base44.entities.SystemBudget.filter({ user_email: user.email }));

            const found = [];
            for (const t of transactions) {
                if (t.type !== 'expense') continue;

                const relevantDate = (t.isPaid && t.paidDate) ? t.paidDate : t.date;
                const priority = t.financial_priority || 'needs';

                let issue = null;
                let isFixable = false;
                let correctBudgetId = null;

                // Find matching system budgets for this date and priority
                const matchingBudgets = sysBudgets.filter(b =>
                    relevantDate >= b.startDate &&
                    relevantDate <= b.endDate &&
                    b.systemBudgetType === priority
                );

                if (matchingBudgets.length > 1) {
                    issue = `CRITICAL: Multiple system budgets found for ${priority} around ${relevantDate}. Delete duplicates manually!`;
                    isFixable = false;
                } else if (matchingBudgets.length === 0) {
                    issue = `No system budget found for ${priority} around ${relevantDate}.`;
                    isFixable = false; // We no longer auto-create. Admin must handle it.
                } else {
                    // Exactly ONE correct budget exists
                    correctBudgetId = matchingBudgets[0].id;
                    if (t.budgetId !== correctBudgetId) {
                        issue = !t.budgetId
                            ? 'Missing Budget ID entirely.'
                            : `Linked to incorrect budget. Expected System Budget: ${correctBudgetId}`;
                        isFixable = true;
                    }
                }

                if (issue) {
                    found.push({ transaction: t, issue, relevantDate, isFixable, correctBudgetId });
                }
            }
            setAnomalies(found);
            setHasAnalyzed(true);
        } catch (err) {
            toast.error("Failed to analyze transactions");
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const fixAnomaly = async (anomaly) => {
        if (!anomaly.isFixable || !anomaly.correctBudgetId) return false;

        try {
            await fetchWithRetry(() => base44.entities.Transaction.update(anomaly.transaction.id, { budgetId: anomaly.correctBudgetId }));

            // Remove from list upon success
            setAnomalies(prev => prev.filter(a => a.transaction.id !== anomaly.transaction.id));
            return true;
        } catch (err) {
            console.error("Failed to fix", anomaly.transaction.id, err);
            return false;
        }
    };

    const fixAll = async () => {
        setIsFixing(true);
        let successCount = 0;
        const fixableAnomalies = anomalies.filter(a => a.isFixable);

        for (const anomaly of fixableAnomalies) {
            const success = await fixAnomaly(anomaly);
            if (success) successCount++;
        }
        setIsFixing(false);
        if (successCount > 0) {
            toast.success(`Automatically fixed ${successCount} transactions`);
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
        } else if (fixableAnomalies.length === 0) {
            toast.info("No auto-fixable anomalies found.");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Transaction ID copied! Use the Admin ID Search to manually edit.");
        setIsOpen(false); // Close drawer to let them search
    };

    const TriggerBtn = (
        <CustomButton variant="outline" className="w-full bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700">
            <ShieldAlert className="w-4 h-4 mr-2" />
            Budget Consistency Check
        </CustomButton>
    );

    const Content = (
        <div className="flex flex-col gap-4 p-4 h-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between shrink-0 border-b pb-4">
                <p className="text-sm text-muted-foreground">Scans the currently loaded view for expenses mapped to invalid or date-mismatched budgets.</p>
                <CustomButton onClick={analyze} disabled={isAnalyzing} size="sm">
                    {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Scan View
                </CustomButton>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px]">
                {!hasAnalyzed ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Search className="w-12 h-12 mb-2" />
                        <p>Click scan to analyze loaded transactions</p>
                    </div>
                ) : anomalies.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-emerald-600 opacity-80">
                        <CheckCircle className="w-12 h-12 mb-2" />
                        <p>All loaded expenses are correctly linked!</p>
                    </div>
                ) : (
                    anomalies.map((anomaly) => (
                        <div key={anomaly.transaction.id} className="bg-red-50/50 border border-red-100 p-3 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-900">{anomaly.transaction.title}</h4>
                                    <p className="text-xs text-red-600 flex items-center mt-1">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        {anomaly.issue}
                                    </p>
                                </div>
                                <span className="font-mono font-semibold text-sm">{formatCurrency(anomaly.transaction.amount, settings)}</span>
                            </div>

                            <div className="flex gap-2 mt-2">
                                {anomaly.isFixable ? (
                                    <CustomButton
                                        size="sm"
                                        variant="primary"
                                        className="flex-1 text-xs h-8"
                                        disabled={isFixing}
                                        onClick={() => fixAnomaly(anomaly).then(s => s && queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] }))}
                                    >
                                        <Wrench className="w-3 h-3 mr-1" /> Auto-Fix
                                    </CustomButton>
                                ) : (
                                    <CustomButton size="sm" variant="outline" className="flex-1 text-xs h-8 opacity-60 cursor-not-allowed" disabled>
                                        <ShieldAlert className="w-3 h-3 mr-1" /> Manual Fix Req.
                                    </CustomButton>
                                )}

                                <CustomButton
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => copyToClipboard(anomaly.transaction.id)}
                                >
                                    <Copy className="w-3 h-3 mr-1" /> Copy ID for Manual Edit
                                </CustomButton>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {anomalies.some(a => a.isFixable) && (
                <div className="pt-4 border-t shrink-0">
                    <CustomButton onClick={fixAll} disabled={isFixing} variant="destructive" className="w-full">
                        {isFixing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Wrench className="w-4 h-4 mr-2" />}
                        Auto-Fix All ({anomalies.filter(a => a.isFixable).length})
                    </CustomButton>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>{TriggerBtn}</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Budget Consistency Check</DrawerTitle>
                    </DrawerHeader>
                    {Content}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{TriggerBtn}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Budget Consistency Check</DialogTitle>
                </DialogHeader>
                {Content}
            </DialogContent>
        </Dialog>
    );
}
