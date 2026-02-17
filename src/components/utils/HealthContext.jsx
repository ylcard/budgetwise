import React, { createContext, useContext, useMemo } from 'react';
import { useTransactions } from '../hooks/useBase44Entities';
import { useDashboardSummary } from '../hooks/useDerivedData';
import { usePeriod } from '../hooks/usePeriod';
import { useSettings } from './SettingsContext';
import { useMergedCategories } from '../hooks/useMergedCategories';
import { useCustomBudgetsForPeriod, useSystemBudgetsForPeriod } from '../hooks/useBase44Entities';

const HealthContext = createContext();

export const HealthProvider = ({ children }) => {
    const { user, settings } = useSettings();
    const { selectedMonth, selectedYear, monthStart, monthEnd } = usePeriod();

    // Fetch necessary data globally
    const { transactions } = useTransactions(monthStart, monthEnd);
    const { categories } = useMergedCategories();
    const { customBudgets } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    const { currentMonthIncome, currentMonthExpenses } = useDashboardSummary(
        transactions,
        selectedMonth,
        selectedYear,
        customBudgets,
        systemBudgets,
        categories,
        settings
    );

    const budgetHealth = useMemo(() => {
        if (!currentMonthIncome || currentMonthIncome === 0) return 0.5;
        const spendRatio = currentMonthExpenses / currentMonthIncome;

        if (spendRatio >= 1.0) return 0.1;  // Dead
        if (spendRatio >= 0.90) return 0.3; // Panicking
        if (spendRatio >= 0.70) return 0.6; // Chilling
        return 1.0;                        // Thriving
    }, [currentMonthIncome, currentMonthExpenses]);

    return (
        <HealthContext.Provider value={{ budgetHealth }}>
            {children}
        </HealthContext.Provider>
    );
};

export const useHealth = () => {
    const context = useContext(HealthContext);
    if (!context) throw new Error("useHealth must be used within HealthProvider");
    return context;
};
