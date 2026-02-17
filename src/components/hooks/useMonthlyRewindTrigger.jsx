import { useEffect, useRef } from 'react';
import { subMonths, getMonth, getYear } from 'date-fns';
import { notifyMonthlyRewindReady } from '../utils/notificationHelpers';
import { useNotifications } from './useNotifications';

/**
 * Triggered on Dashboard load. Checks if a notification exists for the previous month.
 * If not, it creates one.
 */
export const useMonthlyRewindTrigger = (userEmail) => {
    const { allNotifications, isLoading } = useNotifications();
    const hasChecked = useRef(false);

    useEffect(() => {
        if (!userEmail || isLoading || hasChecked.current) return;

        // 1. Identify the month that just ended (e.g., if today is March, check February)
        const lastMonthDate = subMonths(new Date(), 1);
        const lastMonthIndex = getMonth(lastMonthDate);
        const lastMonthYear = getYear(lastMonthDate);

        // 2. Check if a 'story' notification already exists for this period in the database
        const exists = allNotifications.some(n =>
            n.type === 'story' &&
            n.metadata?.monthIndex === lastMonthIndex &&
            n.metadata?.year === lastMonthYear
        );

        hasChecked.current = true;

        // 3. If no notification exists, create it
        if (!exists) {
            notifyMonthlyRewindReady(userEmail, lastMonthIndex, lastMonthYear);
        }
    }, [userEmail, isLoading]);
};
