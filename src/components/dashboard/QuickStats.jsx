import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "../utils/currencyUtils";
import { useSettings } from "../utils/SettingsContext";

export default function QuickStats({ income, expenses, balance, isLoading }) {
    const { settings } = useSettings();

    const stats = [
        {
            title: "Monthly Income",
            value: income,
            icon: TrendingUp,
            gradient: "from-green-500 to-emerald-600",
            bg: "bg-green-50",
            textColor: "text-green-700"
        },
        {
            title: "Monthly Expenses",
            value: expenses,
            icon: TrendingDown,
            gradient: "from-red-500 to-rose-600",
            bg: "bg-red-50",
            textColor: "text-red-700"
        },
        {
            title: "Net Balance",
            value: balance,
            icon: balance >= 0 ? Wallet : DollarSign,
            gradient: balance >= 0 ? "from-blue-500 to-purple-600" : "from-orange-500 to-red-600",
            bg: balance >= 0 ? "bg-blue-50" : "bg-orange-50",
            textColor: balance >= 0 ? "text-blue-700" : "text-orange-700"
        }
    ];

    return (
        <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
                <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <CardContent className="p-6 relative">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300`} />

                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-2">{stat.title}</p>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-32" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-gray-900">
                                        {formatCurrency(stat.value, settings)}
                                    </h3>
                                )}
                            </div>
                            <div className={`p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
