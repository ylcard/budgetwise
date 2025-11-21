import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { usePriorityChartData } from "../hooks/useDerivedData";

export default function PriorityChart({ transactions, categories, goals, monthlyIncome, isLoading }) {
    // Use the extracted hook for calculations
    const chartData = usePriorityChartData(transactions, categories, goals, monthlyIncome);

    if (isLoading) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Actual vs Target by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-80 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg">
            <CardHeader>
                <CardTitle>Actual vs Target by Priority</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="h-80 flex items-center justify-center text-gray-400">
                        <p>No expenses to show yet</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" />
                            <YAxis label={{ value: '% of Income', angle: -90, position: 'insideLeft' }} />
                            <Tooltip
                                formatter={(value) => `${value.toFixed(1)}%`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                            <Bar dataKey="target" name="Target" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        fillOpacity={0.2} // 20% Opacity
                                        stroke={entry.color} // Solid border so the top is clearly visible
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}