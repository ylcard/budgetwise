import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "../utils/SettingsContext";
import { useMonthlyBreakdown } from "../hooks/useDerivedData";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { AlertCircle, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

export default function MonthlyBreakdown({
	transactions,
	categories,
	monthlyIncome,
	isLoading,
	allCustomBudgets,
	selectedMonth,
	selectedYear
}) {
	const { settings } = useSettings();

	// Use the extracted hook which now calculates needs/wants internally using financialCalculations
	const { categoryBreakdown, totalExpenses, needsTotal, wantsTotal } = useMonthlyBreakdown(
		transactions, categories, monthlyIncome, allCustomBudgets, selectedMonth, selectedYear
	);

	// SORTING: Ensure highest expenses are first (Top Left)
	const sortedBreakdown = [...categoryBreakdown].sort((a, b) => b.amount - a.amount);

	// Helper for Alert Icon
	const StatusIndicator = ({ status, diff }) => {
		if (!status || status === 'normal') return null;
		if (status === 'critical') return <AlertCircle size={14} className="text-red-500 animate-pulse" title={`${diff?.toFixed(0)}% above average!`} />;
		if (status === 'warning') return <TrendingUp size={14} className="text-amber-500" title={`${diff?.toFixed(0)}% above average`} />;
		if (status === 'elevated') return <ArrowUpRight size={14} className="text-blue-400" title="Slightly above average" />;
		if (status === 'saving') return <TrendingDown size={14} className="text-emerald-500" title="Below average spending" />;
		return null;
	};

	// Helper for Card Background & Border Styling
	const getAlertCardStyles = (status) => {
		if (status === 'critical') return "bg-red-50/30 border-red-200 hover:border-red-300 hover:shadow-red-100/50";
		if (status === 'warning') return "bg-amber-50/30 border-amber-200 hover:border-amber-300 hover:shadow-amber-100/50";
		if (status === 'saving') return "bg-emerald-50/30 border-emerald-200 hover:border-emerald-300 hover:shadow-emerald-100/50";
		return "bg-white border-gray-100 hover:border-gray-200"; // Normal
	};

	// Helper for header styling
	const SummaryItem = ({ label, amount, className }) => (
		<div className={`text-center px-2 md:px-3 ${className}`}>
			<p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">{label}</p>
			<p className="text-sm font-bold text-gray-900">{formatCurrency(amount, settings)}</p>
		</div>
	);

	// Helper for header divider
	const Divider = () => <div className="hidden md:block h-8 w-px bg-gray-200"></div>;

	return (
		<Card className="w-full h-full border-none shadow-lg flex flex-col bg-white">
			{isLoading ? (
				<div className="p-6 space-y-6">
					<div className="flex justify-between">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-12 w-32" />
					</div>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{[...Array(8)].map((_, i) => (
							<Skeleton key={i} className="h-28 rounded-2xl" />
						))}
					</div>
				</div>
			) : (
				<>
					{/* Integrated Header - Replaces the floating black pill */}
					<CardHeader className="pb-2 border-b border-gray-50">
						<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
							<div>
								<CardTitle className="text-xl font-bold text-gray-900">Monthly Breakdown</CardTitle>
							</div>

							{/* The "Fancier" Summary Section - Grid on Mobile, Flex on Desktop */}
							<div className="w-full md:w-auto grid grid-cols-2 md:flex items-center bg-gray-50 px-1 py-2 rounded-xl border border-gray-100 gap-y-2 md:gap-y-0">
								<SummaryItem label="Income" amount={monthlyIncome} className="border-r border-gray-200 md:border-none" />
								{/* Mobile only spacer implies 2nd col is Expenses */}
								<Divider />
								<Divider />
								<SummaryItem label="Expenses" amount={totalExpenses} />

								{/* Extra columns for Needs/Wants */}
								<div className="col-span-2 border-t border-gray-200 md:border-none md:hidden w-full my-1" />

								<Divider />
								<SummaryItem label="Needs" amount={needsTotal} className="border-r border-gray-200 md:border-none" />
								<Divider />
								<SummaryItem label="Wants" amount={wantsTotal} />
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-6 flex-1">
						{sortedBreakdown.length === 0 ? (
							<div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 min-h-[200px]">
								<p>No expenses to show yet</p>
							</div>
						) : (
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{sortedBreakdown.map((item) => {
									const IconComponent = getCategoryIcon(item.icon);
									const alertStyles = getAlertCardStyles(item.alertStatus);

									return (
										<div
											key={item.id || item.name}
											className={`group relative p-3 rounded-2xl border hover:shadow-md transition-all duration-200 flex flex-col justify-between h-28 overflow-hidden ${alertStyles}`}
										>
											{/* Top Row: Icon & Amount */}
											<div className="flex justify-between items-start mb-2">
												<div
													className="p-2 rounded-xl transition-colors"
													style={{ backgroundColor: `${item.color}15` }}
												>
													<IconComponent size={18} strokeWidth={2.5} style={{ color: item.color }} />
												</div>
												<div className="flex items-center gap-1.5">
													<StatusIndicator status={item?.alertStatus} diff={item?.diffPercentage} />
													<span className="font-bold text-gray-900 text-sm">
														{formatCurrency(item.amount, settings)}
													</span>
												</div>
											</div>
											{/* Bottom Row: Label & Stats */}
											<div>
												<h3 className="font-medium text-gray-700 text-sm mb-1 truncate" title={item.name}>
													{item.name}
												</h3>

												{/* Progress Bar Background */}
												<div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex mb-1.5">
													<div
														className="h-full rounded-full transition-all duration-500"
														style={{
															width: `${item.expensePercentage}%`,
															backgroundColor: item.color
														}}
													/>
												</div>

												<div className="flex justify-between items-center">
													<p className="text-[10px] text-gray-500 font-medium" title="% of Total Expenses">
														{item.expensePercentage.toFixed(1)}% <span className="text-gray-400 font-normal">of Exp</span>
													</p>
													<p className="text-[10px] text-gray-400" title="% of Total Income">
														{item.percentage.toFixed(1)}% <span className="text-gray-300">of Inc</span>
													</p>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</>
			)}
		</Card >
	);
}