import { useEffect, useRef } from 'react';
import { normalizeToMidnight } from '../utils/dateUtils';
import { notifyMonthlyRewindReady } from '../utils/notificationHelpers';
import { useNotifications } from './useNotifications';

/**
 * Hook to check and trigger the "Monthly Rewind" notification.
 * Runs on dashboard load to ensure a summary story exists for the month that just ended.
 * @param {string} userEmail - The current user's email.
 */
export const useMonthlyRewindTrigger = (userEmail) => {
  const { allNotifications, isLoading } = useNotifications();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!userEmail || isLoading || hasChecked.current) return;

    // 1. Identify the month that just ended using centralized date utility
    // Ensures we are checking based on local midnight, not UTC
    const today = normalizeToMidnight(new Date());

    // Calculate previous month (handle January rollover)
    let lastMonthIndex = today.getMonth() - 1;
    let lastMonthYear = today.getFullYear();

    if (lastMonthIndex < 0) {
      lastMonthIndex = 11;
      lastMonthYear -= 1;
    }

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
