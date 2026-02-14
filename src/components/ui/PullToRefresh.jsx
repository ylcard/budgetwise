import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CREATED: 03-Feb-2026
 * PullToRefresh - Native-style pull-to-refresh component for mobile
 * Usage: Wrap scrollable content with this component and provide onRefresh callback
 */

export function PullToRefresh({ children, onRefresh, threshold = 80, disabled = false, className = "" }) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [canPull, setCanPull] = useState(false);
    const touchStartY = useRef(0);
    const containerRef = useRef(null);

    useEffect(() => {
        // Only enable pull-to-refresh on touch devices
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouchDevice || disabled) return;

        const handleTouchStart = (e) => {
            const container = containerRef.current;
            if (!container) return;

            // Only allow pull if scrolled to top
            if (container.scrollTop === 0) {
                setCanPull(true);
                touchStartY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e) => {
            if (!canPull || isRefreshing) return;

            const currentY = e.touches[0].clientY;
            const distance = currentY - touchStartY.current;

            // Only pull down, not up
            if (distance > 0) {
                // Add resistance to pull
                const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
                setPullDistance(resistedDistance);

                // Prevent default scroll when pulling
                if (distance > 10) {
                    e.preventDefault();
                }
            }
        };

        const handleTouchEnd = async () => {
            if (!canPull || isRefreshing) return;

            setCanPull(false);

            // Trigger refresh if pulled beyond threshold
            if (pullDistance >= threshold) {
                setIsRefreshing(true);
                try {
                    await onRefresh();
                } catch (error) {
                    console.error('Refresh error:', error);
                } finally {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }
            } else {
                // Snap back if not pulled enough
                setPullDistance(0);
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('touchstart', handleTouchStart, { passive: true });
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
            container.addEventListener('touchend', handleTouchEnd, { passive: true });
        }

        return () => {
            if (container) {
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('touchmove', handleTouchMove);
                container.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [canPull, pullDistance, threshold, onRefresh, isRefreshing, disabled]);

    const pullProgress = Math.min(pullDistance / threshold, 1);
    const showIndicator = pullDistance > 0 || isRefreshing;

    return (
        <div ref={containerRef} className={`h-full overflow-auto relative ${className}`}>
            <AnimatePresence>
                {showIndicator && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-0 left-0 right-0 flex items-center justify-center z-0 pointer-events-none"
                        style={{
                            height: `${isRefreshing ? 60 : pullDistance}px`,
                            transition: isRefreshing ? 'height 0.3s ease' : 'none'
                        }}
                    >
                        <motion.div
                            animate={{
                                rotate: isRefreshing ? 360 : pullProgress * 360,
                                scale: isRefreshing ? 1 : Math.min(pullProgress, 1)
                            }}
                            transition={{
                                rotate: {
                                    duration: isRefreshing ? 1 : 0,
                                    repeat: isRefreshing ? Infinity : 0,
                                    ease: 'linear'
                                },
                                scale: { duration: 0 }
                            }}
                            className={`w-8 h-8 ${isRefreshing ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                            <RefreshCw className="w-full h-full" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="relative z-10" style={{ paddingTop: isRefreshing ? '60px' : '0', transition: 'padding-top 0.3s ease' }}>
                {children}
            </div>
        </div>
    );
}