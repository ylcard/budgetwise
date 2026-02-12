import { useEffect } from 'react';
import { useCategories } from '@/components/hooks/useBase44Entities';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/components/hooks/queryKeys';

const DEFAULT_SYSTEM_CATEGORIES = [
    { name: 'Housing', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
    { name: 'Groceries', icon: 'ShoppingCart', color: '#10B981', priority: 'needs', is_system: true },
    { name: 'Transport', icon: 'Car', color: '#F59E0B', priority: 'needs', is_system: true },
    { name: 'Bills & Utilities', icon: 'Zap', color: '#06B6D4', priority: 'needs', is_system: true },
    { name: 'Health', icon: 'HeartPulse', color: '#EF4444', priority: 'needs', is_system: true },
    { name: 'Dining Out', icon: 'Utensils', color: '#F97316', priority: 'wants', is_system: true },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#8B5CF6', priority: 'wants', is_system: true },
    { name: 'Entertainment', icon: 'Film', color: '#EC4899', priority: 'wants', is_system: true },
    { name: 'Travel', icon: 'Plane', color: '#0EA5E9', priority: 'wants', is_system: true },
    { name: 'Subscriptions', icon: 'Repeat', color: '#8B5CF6', priority: 'wants', is_system: true }
];

export const useSystemSetup = (user) => {
    const { categories, isLoading } = useCategories();
    const queryClient = useQueryClient();

    useEffect(() => {
        const seedCategories = async () => {
            if (isLoading || !user) return;

            // Only run if user has absolutely NO categories
            if (categories && categories.length === 0) {
                console.log("🌱 First Run: Seeding Default Categories...");
                
                try {
                    // Run sequentially or parallel depending on API limits
                    await Promise.all(DEFAULT_SYSTEM_CATEGORIES.map(cat => 
                        base44.entities.Category.create({ ...cat, user_email: user.email })
                    ));
                    
                    // Force refresh the cache so the UI updates instantly
                    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
                    console.log("✅ Defaults Created");
                } catch (error) {
                    console.error("Failed to seed categories:", error);
                }
            }
        };

        seedCategories();
    }, [user, categories?.length, isLoading, queryClient]);
};
