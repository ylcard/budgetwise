import React, { useState, useMemo, createContext, useContext } from "react";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../utils/dateUtils";

// Unified hook for managing month/year selection and derived date values
const PeriodContext = createContext(null);

export const PeriodProvider = ({ children }) => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const displayDate = useMemo(() => {
        return new Date(selectedYear, selectedMonth);
    }, [selectedMonth, selectedYear]);

    const monthStart = useMemo(() => {
        return getFirstDayOfMonth(selectedMonth, selectedYear);
    }, [selectedMonth, selectedYear]);

    const monthEnd = useMemo(() => {
        return getLastDayOfMonth(selectedMonth, selectedYear);
    }, [selectedMonth, selectedYear]);

    const currentYear = useMemo(() => {
        return now.getFullYear();
    }, []);

    const previousMonth = useMemo(() => {
        return selectedMonth === 0 ? 11 : selectedMonth - 1;
    }, [selectedMonth]);

    const previousYear = useMemo(() => {
        return selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    }, [selectedMonth, selectedYear]);

    const value = {
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
        displayDate,
        monthStart,
        monthEnd,
        currentYear,
        previousMonth,
        previousYear,
    };

    return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export const usePeriod = () => {
    const context = useContext(PeriodContext);
    if (!context) {
        throw new Error("usePeriod must be used within a PeriodProvider");
    }
    return context;
};
