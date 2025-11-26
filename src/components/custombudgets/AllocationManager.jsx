import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import AllocationFormDialog from "./AllocationFormDialog";
import AllocationCard from "./AllocationCard";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useSettings } from "../utils/SettingsContext";
// import { useCashWallet } from "../hooks/useBase44Entities";
// import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils";
import { formatCurrency } from "../utils/currencyUtils";

export default function AllocationManager({
    customBudget,
    allocations,
    categories,
    allocationStats,
    onCreateAllocation,
    onUpdateAllocation,
    onDeleteAllocation,
    isSubmitting
}) {
    const { settings, user } = useSettings();
    // const { cashWallet } = useCashWallet(user);
    const [showForm, setShowForm] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);
    const [deleteAllocationId, setDeleteAllocationId] = useState(null);

    const handleSubmit = (data) => {
        if (editingAllocation) {
            onUpdateAllocation({ id: editingAllocation.id, data });
        } else {
            onCreateAllocation({
                ...data,
                customBudgetId: customBudget.id
            });
        }
        setShowForm(false);
        setEditingAllocation(null);
    };

    const handleEdit = (allocation) => {
        setEditingAllocation(allocation);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setDeleteAllocationId(id);
    };

    const confirmDelete = () => {
        if (deleteAllocationId) {
            onDeleteAllocation(deleteAllocationId);
            setDeleteAllocationId(null);
        }
    };

    // Calculate remaining funds purely based on allocations (no expenses)
    // Card remaining = customBudget.allocatedAmount - sum of digital allocations
    /* const digitalAllocations = allocations.filter(a => a.allocationType === 'digital');
    const totalDigitalAllocated = digitalAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const remainingCard = customBudget.allocatedAmount - totalDigitalAllocated;

    // Cash remaining per currency = cashAllocations[currency] - sum of cash allocations for that currency
    const remainingCashByCurrency = {};
    if (customBudget?.cashAllocations) {
        customBudget.cashAllocations.forEach(cashAlloc => {
            const cashAllocationsForCurrency = allocations.filter(
                a => a.allocationType === 'cash' && a.currency === cashAlloc.currencyCode
            );
            const totalAllocatedForCurrency = cashAllocationsForCurrency.reduce((sum, a) => sum + a.allocatedAmount, 0);

            remainingCashByCurrency[cashAlloc.currencyCode] = cashAlloc.amount - totalAllocatedForCurrency;
        });
    } */

    // REFACTOR: Unified Consumption Model
    // Remaining funds = Total Budget - Sum of ALL allocations
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const remainingFunds = customBudget.allocatedAmount - totalAllocated;

    return (
        <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Budget Allocations</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                        Allocate portions of your budget to specific categories
                    </p>
                </div>
                {/* UPDATED 15-Jan-2025: Changed to CustomButton with create variant */}
                <CustomButton
                    onClick={() => setShowForm(true)}
                    size="sm"
                    variant="create"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Allocate Funds
                </CustomButton>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="max-w-xs p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <p className="text-lg text-center font-bold text-gray-600 mb-4">Unallocated Funds</p>

                    <div className="flex flex-col items-center">
                        <p className={`text-3xl font-bold ${remainingFunds < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCurrency(remainingFunds, settings)}
                        </p>
                    </div>
                </div>

                <AllocationFormDialog
                    open={showForm}
                    onOpenChange={setShowForm}
                    allocation={editingAllocation}
                    customBudget={customBudget}
                    categories={categories}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    settings={settings}
                // cashWallet={cashWallet}
                />

                {/* Allocations List */}
                {allocations.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <p>No allocations yet. Add your first one!</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {allocations.map((allocation) => {
                            const category = categories.find(c => c.id === allocation.categoryId);
                            const stats = allocationStats?.categorySpending?.[allocation.categoryId];

                            return (
                                <AllocationCard
                                    key={allocation.id}
                                    allocation={allocation}
                                    category={category}
                                    stats={stats}
                                    onEdit={() => handleEdit(allocation)}
                                    onDelete={() => handleDelete(allocation.id)}
                                    settings={settings}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Delete confirmation dialog */}
                <ConfirmDialog
                    open={!!deleteAllocationId}
                    onOpenChange={(open) => !open && setDeleteAllocationId(null)}
                    title="Delete Allocation?"
                    message="Are you sure you want to delete this allocation? This action cannot be undone."
                    onConfirm={confirmDelete}
                    confirmText="Delete"
                    cancelText="Cancel"
                    isDestructive={true}
                />
            </CardContent>
        </Card>
    );
}
