import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyUtils";
import { useSettings } from "@/components/utils/SettingsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import CategorySelect from "@/components/ui/CategorySelect";

// Replaces the old ImportReview component
// export default function CategorizeReview({ data, categories, onUpdateRow, onDeleteRow }) {
export default function CategorizeReview({ data, categories, customBudgets = [], onUpdateRow, onDeleteRow }) {
    const { settings } = useSettings();

    // SORTING LOGIC: Needs (A-Z) -> Wants (A-Z) -> Savings (A-Z) -> Others
    const sortedCategories = useMemo(() => {
        const priorityOrder = { needs: 1, wants: 2, savings: 3 };

        return [...categories].sort((a, b) => {
            const pA = priorityOrder[a.priority] || 4;
            const pB = priorityOrder[b.priority] || 4;

            if (pA !== pB) return pA - pB;
            return a.name.localeCompare(b.name);
        });
    }, [categories]);

    // Filter active custom budgets for the dropdown
    // Requires refactor to allow intelligent filter, not just "active" CBs. For back-filling.
    const activeCustomBudgets = useMemo(() => {
        return customBudgets.filter(cb => cb.status === 'active' || cb.status === 'planned');
    }, [customBudgets]);


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Review & Categorize</span>
                    <Badge variant="outline">{data.length} records found</Badge>
                </CardTitle>
                <p className="text-sm text-gray-500">
                    Review the automatically categorized transactions below. You can manually override the category if needed.
                </p>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-auto max-h-[500px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="w-[200px]">Category</TableHead>
                                {/* <TableHead className="w-[120px]">Budget</TableHead> */}
                                <TableHead className="w-[160px]">Budget</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell>{row.title}</TableCell>
                                    <TableCell>
                                        {row.type === 'expense' ? (
                                            <CategorySelect
                                                value={row.categoryId}
                                                categories={sortedCategories}
                                                onValueChange={(value) => {
                                                    const cat = categories.find(c => c.id === value);
                                                    onUpdateRow(index, {
                                                        categoryId: value,
                                                        category: cat ? cat.name : 'Uncategorized',
                                                        financial_priority: cat ? (cat.priority || 'wants') : row.financial_priority
                                                    });
                                                }}
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {row.type === 'expense' ? (
                                            <Select
                                                value={row.customBudgetId || row.financial_priority || 'wants'}
                                                onValueChange={(val) => {
                                                    if (['needs', 'wants', 'savings'].includes(val)) {
                                                        // Selected a System Priority
                                                        onUpdateRow(index, { financial_priority: val, customBudgetId: null });
                                                    } else {
                                                        // Selected a Custom Budget
                                                        onUpdateRow(index, { customBudgetId: val, financial_priority: 'wants' });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-full h-8">
                                                    <SelectValue placeholder="Select Budget" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel>System</SelectLabel>
                                                        <SelectItem value="needs">Needs</SelectItem>
                                                        <SelectItem value="wants">Wants</SelectItem>
                                                        <SelectItem value="savings">Savings</SelectItem>
                                                    </SelectGroup>
                                                    {activeCustomBudgets.length > 0 && (
                                                        <SelectGroup>
                                                            <SelectLabel>Custom Budgets</SelectLabel>
                                                            {activeCustomBudgets.map(cb => (
                                                                <SelectItem key={cb.id} value={cb.id}>{cb.name}</SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${row.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(Math.abs(row.amount), settings)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={row.type === 'expense' ? 'destructive' : 'default'}>
                                            {row.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <CustomButton
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDeleteRow(index)}
                                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </CustomButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
