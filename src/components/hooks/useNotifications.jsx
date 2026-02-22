import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QUERY_KEYS } from './queryKeys';
import { useSettings } from '../utils/SettingsContext';
import { fetchWithRetry } from '../utils/generalUtils';

/**
 * CREATED 14-Feb-2026: Hook for managing notifications
 * Provides methods to fetch, mark as read, dismiss, and delete notifications
 */
export const useNotifications = () => {
    const { user } = useSettings();
    const queryClient = useQueryClient();

    // Fetch all notifications for current user, sorted by priority and date
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.NOTIFICATIONS],
        queryFn: async () => {
            const all = await fetchWithRetry(() => base44.entities.Notification.filter(
                { created_by: user?.email },
                '-created_date'
            ));

            // Sort by priority (urgent > high > medium > low) then by date
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return all.sort((a, b) => {
                const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return new Date(b.created_date) - new Date(a.created_date);
            });
        },
        enabled: !!user,
        staleTime: 1000 * 30, // Refresh every 30 seconds
    });

    // Mark notification as read
    const markAsReadMutation = useMutation({
        mutationFn: (notificationId) =>
            fetchWithRetry(() => base44.entities.Notification.update(notificationId, { isRead: true })),
        onMutate: async (notificationId) => {
            // Cancel outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });

            // Snapshot the previous data
            const previousNotifications = queryClient.getQueryData([QUERY_KEYS.NOTIFICATIONS]);

            // Optimistically update the cache to instantly mark it as read
            if (previousNotifications) {
                queryClient.setQueryData([QUERY_KEYS.NOTIFICATIONS], old =>
                    old.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
                );
            }
            return { previousNotifications };
        },
        onError: (err, notificationId, context) => {
            // Rollback if the mutation fails
            if (context?.previousNotifications) {
                queryClient.setQueryData([QUERY_KEYS.NOTIFICATIONS], context.previousNotifications);
            }
        },
        onSettled: () => {
            // Sync with server in the background
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        }
    });

    // Dismiss notification
    const dismissMutation = useMutation({
        mutationFn: (notificationId) =>
            fetchWithRetry(() => base44.entities.Notification.update(notificationId, { isDismissed: true })),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Delete notification
    const deleteMutation = useMutation({
        mutationFn: (notificationId) =>
            fetchWithRetry(() => base44.entities.Notification.delete(notificationId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
            // Chunking to prevent 429s on 'Mark All Read'
            const chunkSize = 20;
            for (let i = 0; i < unreadIds.length; i += chunkSize) {
                const chunk = unreadIds.slice(i, i + chunkSize);
                await Promise.all(chunk.map(id => fetchWithRetry(() => base44.entities.Notification.update(id, { isRead: true }))));
                if (i + chunkSize < unreadIds.length) await new Promise(res => setTimeout(res, 250));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Clear all dismissed
    const clearDismissedMutation = useMutation({
        mutationFn: async () => {
            const dismissedIds = notifications.filter(n => n.isDismissed).map(n => n.id);
            if (dismissedIds.length > 0) {
                await fetchWithRetry(() => base44.entities.Notification.deleteMany({ id: { $in: dismissedIds } }));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Computed values
    const unreadCount = notifications.filter(n => !n.isRead && !n.isDismissed).length;
    const activeNotifications = notifications.filter(n => !n.isDismissed);
    const urgentNotifications = activeNotifications.filter(n => n.priority === 'urgent' && !n.isRead);

    return {
        notifications: activeNotifications,
        allNotifications: notifications,
        unreadCount,
        urgentNotifications,
        isLoading,
        markAsRead: markAsReadMutation.mutate,
        dismiss: dismissMutation.mutate,
        delete: deleteMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
        clearDismissed: clearDismissedMutation.mutate,
        isProcessing: markAsReadMutation.isPending || dismissMutation.isPending || deleteMutation.isPending,
    };
};