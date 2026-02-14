import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QUERY_KEYS } from './queryKeys';
import { useSettings } from '../utils/SettingsContext';

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
            const all = await base44.entities.Notification.filter(
                { user_email: user?.email },
                '-created_date'
            );
            
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
            base44.entities.Notification.update(notificationId, { isRead: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Dismiss notification
    const dismissMutation = useMutation({
        mutationFn: (notificationId) => 
            base44.entities.Notification.update(notificationId, { isDismissed: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Delete notification
    const deleteMutation = useMutation({
        mutationFn: (notificationId) => 
            base44.entities.Notification.delete(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
            await Promise.all(unreadIds.map(id => 
                base44.entities.Notification.update(id, { isRead: true })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });

    // Clear all dismissed
    const clearDismissedMutation = useMutation({
        mutationFn: async () => {
            const dismissedIds = notifications.filter(n => n.isDismissed).map(n => n.id);
            await Promise.all(dismissedIds.map(id => 
                base44.entities.Notification.delete(id)
            ));
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