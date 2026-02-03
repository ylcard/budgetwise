import { CustomButton } from "@/components/ui/CustomButton";
import { CheckCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/currencyUtils";

/**
 * CREATED: 03-Feb-2026
 * Renamed from BudgetBar to VerticalBar
 * Displays a vertical bar visualization of budget data
 */

export default function VerticalBar({
    budget,
    isCustom = false,
    isSavings = false,
    settings,
    onDelete,
    onComplete,
    hideActions = false
}) {
    const {
        stats,
        targetAmount,
        expectedAmount = 0,
        maxHeight,
        actualSavings,
        savingsTarget
    } = budget;

    const isCompleted = budget.status === 'completed';
    const barColor = budget.color || '#3B82F6';

    // --- Unified Data Calculation ---
    let allocated = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;

    if (isSavings) {
        allocated = savingsTarget || 0;
        paidAmount = actualSavings || 0;
        unpaidAmount = 0;
    } else if (isCustom && stats) {
        allocated = stats.totalBudget || 0;
        paidAmount = stats.paidAmount || 0;
        unpaidAmount = expectedAmount;
    } else {
        allocated = targetAmount || budget.budgetAmount || budget.allocatedAmount || 0;
        paidAmount = stats?.paidAmount || 0;
        unpaidAmount = expectedAmount;
    }

    // Recalculate Over/Surplus logic locally
    const used = paidAmount + unpaidAmount;
    const isOver = used > allocated;

    // Heights
    const safeMaxHeight = maxHeight > 0 ? maxHeight : (Math.max(allocated, used) || 1);
    const safeAllocated = allocated > 0 ? allocated : 1;

    // VISUAL LOGIC:
    // Savings: Bar grows from 0 -> Target (Standard Progress)
    // Needs/Wants: Bar starts Full -> Shrinks to 0 (Depleting Bucket)
    let primaryBarHeightPct = 0;
    
    if (isSavings) {
        primaryBarHeightPct = (paidAmount / safeMaxHeight) * 100;
    } else {
        const remaining = Math.max(0, allocated - used);
        primaryBarHeightPct = (remaining / safeAllocated) * 100;
    }

    const expectedHeightPct = (unpaidAmount / safeMaxHeight) * 100;
    
    const showTargetLine = isSavings && allocated > 0;
    const targetLinePosition = (allocated / safeMaxHeight) * 100;

    // Labels & Colors
    let remainingDisplay = 0;
    let statusLabel = '';
    let statusColor = '';

    if (isSavings) {
        if (isOver) {
            remainingDisplay = used - allocated;
            statusLabel = 'Surplus';
            statusColor = 'text-emerald-600';
        } else {
            remainingDisplay = allocated - used;
            statusLabel = 'Shortfall';
            statusColor = 'text-amber-600';
        }
    } else {
        if (isOver) {
            remainingDisplay = used - allocated;
            statusLabel = 'Over Limit';
            statusColor = 'text-red-600';
        } else {
            remainingDisplay = allocated - used;
            statusLabel = 'Under Limit';
            statusColor = 'text-blue-600';
        }
    }

    return (
        <Link
            to={`/BudgetDetail?id=${budget.id}`}
            state={{ from: '/Dashboard' }}
            className="flex-shrink-0"
        >
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
                {/* Bar Graph */}
                <div className={`relative w-16 bg-gray-100 rounded-xl h-48 overflow-hidden hover:shadow-lg transition-all ${isOver && !isSavings ? 'border-2 border-red-100 bg-red-50' : ''}`}>
                    {/* Paid Bar */}
                    <div
                        className="absolute bottom-0 w-full rounded-b-xl transition-all duration-300"
                        style={{
                            height: `${primaryBarHeightPct}%`,
                            backgroundColor: isSavings ? barColor : `${barColor}`,
                            opacity: isSavings ? 1 : 0.8
                        }}
                    />

                    {/* Unpaid "Ghost" Load - Only for Savings */}
                    {unpaidAmount > 0 && isSavings && (
                        <div
                            className="absolute w-full transition-all duration-300"
                            style={{
                                bottom: `${primaryBarHeightPct}%`,
                                height: `${expectedHeightPct}%`,
                                opacity: 0.6,
                                backgroundImage: `linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)`,
                                backgroundSize: '8px 8px',
                                borderTop: `1px solid ${barColor}`
                            }}
                        />
                    )}

                    {/* Target Line */}
                    {showTargetLine && (
                        <div
                            className="absolute w-full border-t-2 border-dashed border-gray-800 z-10 opacity-50"
                            style={{ bottom: `${Math.min(targetLinePosition, 100)}%` }}
                        />
                    )}

                    {/* Completed badge */}
                    {isCompleted && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50">
                            <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                <CheckCircle className="w-3 h-3" />
                                Done
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    {!hideActions && isCustom && !isCompleted && (
                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            {onComplete && (
                                <CustomButton
                                    variant="success"
                                    size="icon-sm"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onComplete(budget.id);
                                    }}
                                >
                                    <CheckCircle className="w-3 h-3" />
                                </CustomButton>
                            )}
                            {onDelete && (
                                <CustomButton
                                    variant="delete"
                                    size="icon-sm"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (confirm('Delete budget?')) onDelete(budget.id);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </CustomButton>
                            )}
                        </div>
                    )}
                </div>

                {/* Data/Text Grid */}
                <div className="w-40 px-1">
                    <p className="font-bold text-gray-900 text-xs truncate mb-2 text-center" title={budget.name}>{budget.name}</p>

                    <div className="grid grid-cols-2 gap-y-1 gap-x-1 text-[10px] leading-tight">
                        {/* Row 1 */}
                        <div className="text-left">
                            <p className="text-gray-400">{isSavings ? 'Target' : 'Budget'}</p>
                            <p className="font-semibold text-gray-700 truncate" title={formatCurrency(allocated, settings)}>
                                {formatCurrency(allocated, settings)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400">{statusLabel}</p>
                            <p className={`font-semibold truncate ${statusColor}`} title={formatCurrency(remainingDisplay, settings)}>
                                {formatCurrency(remainingDisplay, settings)}
                            </p>
                            {!isSavings && !isOver && (
                                <p className="text-[8px] text-emerald-600/80 leading-none mt-0.5 transform scale-90 origin-right font-medium">
                                    (Save it!)
                                </p>
                            )}
                        </div>

                        {/* Row 2 */}
                        <div className="text-left">
                            <p className="text-gray-400">{isSavings ? 'Actual' : 'Paid'}</p>
                            <p className="font-semibold text-gray-900 truncate" title={formatCurrency(paidAmount, settings)}>
                                {formatCurrency(paidAmount, settings)}
                            </p>
                        </div>
                        <div className="text-right">
                            {!isSavings ? (
                                <>
                                    <p className="text-gray-400">Unpaid</p>
                                    <p className={`font-semibold truncate ${unpaidAmount > 0 ? 'text-amber-600' : 'text-gray-300'}`} title={formatCurrency(unpaidAmount, settings)}>
                                        {formatCurrency(unpaidAmount, settings)}
                                    </p>
                                </>
                            ) : (
                                <div className="h-full flex items-end justify-end">
                                    <span className="text-[9px] text-gray-300 italic">Net Flow</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}