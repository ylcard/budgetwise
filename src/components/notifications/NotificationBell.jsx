import { memo } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNotifications } from '../hooks/useNotifications';

/**
 * CREATED 14-Feb-2026: Notification bell icon with badge
 * Can be used standalone or as trigger for NotificationCenter
 */
const NotificationBell = memo(({ onClick, className }) => {
    const { unreadCount, urgentNotifications } = useNotifications();
    const hasUrgent = urgentNotifications.length > 0;

    return (
        <button 
            onClick={onClick}
            className={cn(
                "relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors",
                className
            )}
        >
            <Bell className={cn(
                "w-5 h-5",
                hasUrgent ? "text-red-600" : "text-gray-600 dark:text-gray-400"
            )} />
            
            <AnimatePresence>
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={cn(
                            "absolute -top-1 -right-1 min-w-5 h-5 px-1 text-white text-xs font-bold rounded-full flex items-center justify-center",
                            hasUrgent ? "bg-red-500 animate-pulse" : "bg-blue-500"
                        )}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;