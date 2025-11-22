import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyUtils";
import { useSettings } from "@/components/utils/SettingsContext";

export default function ImportReview({ data, onDeleteRow }) {
    const { settings } = useSettings();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Review Transactions</span>
                    <Badge variant="outline">{data.length} records found</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-auto max-h-[500px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
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
                                        <Badge variant="secondary">{row.category || 'Uncategorized'}</Badge>
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
