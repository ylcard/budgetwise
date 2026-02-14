import { memo, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { CustomButton } from '../ui/CustomButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from './NotificationItem';

/**
 * CREATED 14-Feb-2026: Notification center with filtering and actions
 */
const NotificationCenter = memo(({ trigger }) => {
    const { 
        notifications, 
        unreadCount, 
        markAsRead, 
        dismiss, 
        markAllAsRead, 
        clearDismissed,
        isLoading 
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all');

    // Group by category
    const groupedNotifications = useMemo(() => {
        const groups = {
            all: notifications,
            unread: notifications.filter(n => !n.isRead),
            urgent: notifications.filter(n => n.priority === 'urgent'),
            bank_sync: notifications.filter(n => n.category === 'bank_sync'),
            budgets: notifications.filter(n => n.category === 'budgets'),
            transactions: notifications.filter(n => n.category === 'transactions'),
            recurring: notifications.filter(n => n.category === 'recurring'),
        };
        return groups;
    }, [notifications]);

    const currentNotifications = groupedNotifications[selectedTab] || [];

    const handleNavigate = () => {
        setIsOpen(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            {trigger ? (
                <SheetTrigger asChild>
                    {trigger}
                </SheetTrigger>
            ) : (
                <SheetTrigger asChild>
                    <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Bell className="w-5 h-5 text-gray-600" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                </SheetTrigger>
            )}

            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                    {unreadCount}
                                </Badge>
                            )}
                        </SheetTitle>
                        <div className="flex gap-2">
                            <CustomButton
                                variant="ghost"
                                size="icon"
                                onClick={() => markAllAsRead()}
                                disabled={unreadCount === 0}
                                title="Mark all as read"
                            >
                                <CheckCheck className="w-4 h-4" />
                            </CustomButton>
                            <CustomButton
                                variant="ghost"
                                size="icon"
                                onClick={() => clearDismissed()}
                                title="Clear dismissed"
                            >
                                <Trash2 className="w-4 h-4" />
                            </CustomButton>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
                    <TabsList className="w-full justify-start rounded-none border-b px-6 bg-transparent h-auto p-0">
                        <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                            All
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                            Unread
                            {groupedNotifications.unread.length > 0 && (
                                <Badge variant="secondary" className="ml-2">{groupedNotifications.unread.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="urgent" className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-none">
                            Urgent
                            {groupedNotifications.urgent.length > 0 && (
                                <Badge variant="destructive" className="ml-2">{groupedNotifications.urgent.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto">
                        <TabsContent value={selectedTab} className="m-0 p-4 space-y-3">
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : currentNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Bell className="w-12 h-12 text-gray-300 mb-3" />
                                    <p className="text-gray-500 font-medium">No notifications</p>
                                    <p className="text-sm text-gray-400">You're all caught up!</p>
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {currentNotifications.map(notification => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkRead={markAsRead}
                                            onDismiss={dismiss}
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </AnimatePresence>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
});

NotificationCenter.displayName = 'NotificationCenter';

export default NotificationCenter;