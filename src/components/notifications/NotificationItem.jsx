import { memo, forwardRef } from 'react';
import { X, ExternalLink, CheckCircle, AlertTriangle, Info, AlertCircle, Zap, Sparkles } from 'lucide-react';
import { CustomButton } from '../ui/CustomButton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

/**
 * CREATED 14-Feb-2026: Individual notification item component
 */
const NotificationItem = memo(forwardRef(({ notification, onMarkRead, onDismiss, onNavigate }, ref) => {
  const navigate = useNavigate();

  const typeConfig = {
    success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    action: { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    story: { icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  };

  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;

  const handleClick = (e) => {
    if (notification.actionUrl) {
      if (onNavigate) onNavigate();
      navigate(notification.actionUrl);
    }
  };

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDismiss(notification.id);
  };

  const ContentWrapper = 'div';
  const wrapperProps = { onClick: handleClick, className: "flex gap-3 w-full pr-8" };

  return (
    <div
      ref={ref}
      className={cn(
        "group relative p-4 rounded-lg border transition-all cursor-pointer block hover:shadow-md",
        notification.isRead ? 'bg-white' : config.bg,
        notification.isRead ? 'border-gray-200' : config.border,
      )}
    >
      <ContentWrapper {...wrapperProps}>
        {/* Icon */}
        <div className={cn("shrink-0 w-8 h-8 rounded-full flex items-center justify-center", config.bg)}>
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "font-semibold text-sm",
              notification.isRead ? 'text-gray-700' : 'text-gray-900'
            )}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1.5" />
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, includeSeconds: true })}
            </span>

            {notification.actionUrl && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                {notification.actionLabel || 'View'}
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </ContentWrapper>

      {/* Dismiss Button */}
      <CustomButton
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleDismiss}
      >
        <X className="w-4 h-4" />
      </CustomButton>
    </div>
  );
}));

NotificationItem.displayName = 'NotificationItem';

export default NotificationItem;