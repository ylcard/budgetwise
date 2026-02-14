import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QUERY_KEYS } from './queryKeys';
import { useAuth } from '@/lib/AuthContext';
import { useMemo } from 'react';

/**
 * CREATED 14-Feb-2026: Hook to merge system categories and user custom categories
 * System categories are global and immutable
 * Custom categories are user-specific and editable
 */
export const useMergedCategories = () => {
    const { user } = useAuth();

    // Fetch system categories (available to all users)
    const { data: systemCategories = [], isLoading: isLoadingSystem } = useQuery({
        queryKey: [QUERY_KEYS.SYSTEM_CATEGORIES],
        queryFn: () => base44.entities.SystemCategory.list(),
        staleTime: 1000 * 60 * 60, // Cache for 1 hour (rarely changes)
    });

    // Fetch user's custom categories
    const { data: customCategories = [], isLoading: isLoadingCustom } = useQuery({
        queryKey: [QUERY_KEYS.CATEGORIES, user?.email],
        queryFn: () => base44.entities.Category.filter({ created_by: user?.email }),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    // Merge categories with system categories first, then custom
    const allCategories = useMemo(() => {
        // Add isSystemCategory flag to system categories if not present
        const markedSystemCategories = systemCategories.map(cat => ({
            ...cat,
            isSystemCategory: true
        }));

        // Add isSystemCategory: false flag to custom categories
        const markedCustomCategories = customCategories.map(cat => ({
            ...cat,
            isSystemCategory: false
        }));

        // Combine: system categories first, then custom
        return [...markedSystemCategories, ...markedCustomCategories];
    }, [systemCategories, customCategories]);

    // Split by priority for convenience
    const needsCategories = useMemo(
        () => allCategories.filter(cat => cat.priority === 'needs'),
        [allCategories]
    );

    const wantsCategories = useMemo(
        () => allCategories.filter(cat => cat.priority === 'wants'),
        [allCategories]
    );

    // Get only custom categories (for editing/deletion)
    const customOnly = useMemo(
        () => allCategories.filter(cat => !cat.isSystemCategory),
        [allCategories]
    );

    // Get only system categories
    const systemOnly = useMemo(
        () => allCategories.filter(cat => cat.isSystemCategory),
        [allCategories]
    );

    return {
        categories: allCategories,
        systemCategories: systemOnly,
        customCategories: customOnly,
        needsCategories,
        wantsCategories,
        isLoading: isLoadingSystem || isLoadingCustom,
        hasCustomCategories: customCategories.length > 0,
        hasSystemCategories: systemCategories.length > 0,
    };
};