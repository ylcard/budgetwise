import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Circle } from "lucide-react";
import { iconMap } from "../utils/iconMapConfig";
import { formatCurrency } from "../utils/currencyUtils";
import { useSettings } from "../utils/SettingsContext";

export default function BudgetOverview({ transactions, categories, /* calculateMonthlyAmount, */ isLoading }) {
  const { settings } = useSettings();

  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {});

  // DEPRECATED: This logic should use t.amount directly, not calculateMonthlyAmount
  // const monthlyAmount = calculateMonthlyAmount(t); // ❌ UNDEFINED FUNCTION
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const categoryId = t.category_id || 'uncategorized';
      // Using t.amount directly instead of calculateMonthlyAmount(t)
      const amount = t.amount; // ✅ FIXED: Direct amount usage
      acc[categoryId] = (acc[categoryId] || 0) + amount;
      return acc;
    }, {});

  const chartData = Object.entries(expensesByCategory).map(([categoryId, amount]) => {
    const category = categoryMap[categoryId];
    return {
      name: category?.name || 'Uncategorized',
      value: amount,
      color: category?.color || '#94A3B8'
    };
  }).sort((a, b) => b.value - a.value);

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>
            ⚠️ DEPRECATED: Spending by Category
            <span className="text-xs text-red-600 ml-2">(Use MonthlyBreakdown instead)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>
            ⚠️ DEPRECATED: Spending by Category
            <span className="text-xs text-red-600 ml-2">(Use MonthlyBreakdown instead)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>No expenses yet. Start tracking your spending!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg opacity-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚠️ DEPRECATED: Spending by Category
          <span className="text-sm font-normal text-red-600">
            (Component not in use - see MonthlyBreakdown.jsx)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* DEPRECATED: Pie chart removed - app uses progress bars */}
        {/* 
        <div className="grid md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(value, settings)}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        */}

        {/* Only showing list view - pie chart commented out */}
        <div className="space-y-3">
          {chartData.slice(0, 6).map((item, index) => {
            const category = Object.values(categoryMap).find(c => c.name === item.name);
            const IconComponent = category?.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;
            
            return (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">{formatCurrency(item.value, settings)}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js