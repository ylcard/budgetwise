/*
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CustomBudgetCard from "./CustomBudgetCard";
import { useSettings } from "../utils/SettingsContext";
*/

/*
const statusConfig = {
    active: { label: "Active", color: "text-green-600", bg: "bg-green-50" },
    completed: { label: "Completed", color: "text-blue-600", bg: "bg-blue-50" },
    archived: { label: "Archived", color: "text-gray-600", bg: "bg-gray-50" }
};
*/

/*
export default function CustomBudgetList({ customBudgets, onEdit, onDelete }) {
    const { settings } = useSettings();
    const queryClient = useQueryClient();

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => base44.entities.Transaction.list(),
        initialData: [],
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.CustomBudget.update(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
        },
    });

    const handleStatusChange = (id, newStatus) => {
        updateStatusMutation.mutate({ id, status: newStatus });
    };

    const groupedBudgets = useMemo(() => {
        // Separate system and custom budgets
        const systemBudgets = customBudgets.filter(cb => cb.isSystemBudget);
        const customOnly = customBudgets.filter(cb => !cb.isSystemBudget);

        // Group custom budgets by status
        const grouped = customOnly.reduce((acc, budget) => {
            const status = budget.status || 'active';
            if (!acc[status]) acc[status] = [];
            acc[status].push(budget);
            return acc;
        }, {});

        return { systemBudgets, customBudgets: grouped };
    }, [customBudgets]);

    if (customBudgets.length === 0) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Your Custom Budgets</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        <p>No custom budgets yet. Create your first one!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }
*/

/*
    return (
        <div className="space-y-6">
        */
            {/* System Budgets */}
            /*
            {groupedBudgets.systemBudgets.length > 0 && (
                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-600">
                                System Budgets
                            </span>
                            <span className="text-gray-400">({groupedBudgets.systemBudgets.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedBudgets.systemBudgets.map((budget) => (
                                <CustomBudgetCard
                                    key={budget.id}
                                    budget={budget}
                                    transactions={transactions}
                                    settings={settings}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onStatusChange={handleStatusChange}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
*/
            {/* Custom Budgets by Status */}
            /*
            {Object.entries(statusConfig).map(([status, config]) => {
                const statusBudgets = groupedBudgets.customBudgets[status] || [];
                if (statusBudgets.length === 0) return null;

                return (
                    <Card key={status} className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-lg text-sm ${config.bg} ${config.color}`}>
                                    {config.label}
                                </span>
                                <span className="text-gray-400">({statusBudgets.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {statusBudgets.map((budget) => (
                                    <CustomBudgetCard
                                        key={budget.id}
                                        budget={budget}
                                        transactions={transactions}
                                        settings={settings}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onStatusChange={handleStatusChange}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
*/