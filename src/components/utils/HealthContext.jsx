import React, { createContext, useContext, useMemo } from 'react';
// REMOVED 10-Mar-2026: All data-fetching hooks removed from HealthProvider.
// HealthProvider sits in the Layout and was independently fetching Transactions, Categories,
// CustomBudgets, and SystemBudgets — duplicating every Dashboard fetch and causing 429s.
// Now accepts income/expense values directly via setBudgetHealth.
// import { useTransactions } from '../hooks/useBase44Entities';
// import { useDashboardSummary } from '../hooks/useDerivedData';
// import { usePeriod } from '../hooks/usePeriod';
// import { useSettings } from './SettingsContext';
// import { useMergedCategories } from '../hooks/useMergedCategories';
// import { useCustomBudgetsForPeriod, useSystemBudgetsForPeriod } from '../hooks/useBase44Entities';

const HealthContext = createContext();

export const HealthProvider = ({ children }) => {
    // UPDATED 10-Mar-2026: HealthProvider is now a passive context container.
    // The Dashboard pushes budgetHealth into it via setBudgetHealth.
    // This eliminates ALL independent data-fetching from the Layout-level provider.
    const [budgetHealth, setBudgetHealth] = React.useState(0.5);

    const value = useMemo(() => ({ budgetHealth, setBudgetHealth }), [budgetHealth]);

    return (
        <HealthContext.Provider value={value}>
            {children}
        </HealthContext.Provider>
    );
};

export const useHealth = () => {
    const context = useContext(HealthContext);
    if (!context) throw new Error("useHealth must be used within HealthProvider");
    return context;
};