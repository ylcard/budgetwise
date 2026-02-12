import { useEffect } from 'react';
import { useCategories, useGoals } from '@/components/hooks/useBase44Entities';
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
    // Fetch both Categories and Goals
    const { categories, isLoading: catsLoading } = useCategories();
    const { goals, isLoading: goalsLoading } = useGoals(user);
    const queryClient = useQueryClient();

    useEffect(() => {
        const seedSystem = async () => {
            if (!user || catsLoading || goalsLoading) return;

            const promises = [];

            // 1. Seed Categories (if empty)
            if (categories && categories.length === 0) {
                console.log("🌱 First Run: Seeding Default Categories...");
                DEFAULT_SYSTEM_CATEGORIES.forEach(cat => {
                    promises.push(base44.entities.Category.create({ ...cat, user_email: user.email }));
                });
            }

            // 2. Seed Goals (if empty) -> The "20%" of the 50/30/20 rule
            if (goals && goals.length === 0) {
                console.log("🌱 First Run: Seeding Default Savings Goal...");
                promises.push(base44.entities.Goal.create({
                    name: "General Savings",
                    target_amount: 10000, // Default target
                    current_amount: 0,
                    allocation_percentage: 20, // 20% Savings Rule
                    icon: 'PiggyBank',
                    color: '#10B981',
                    user_email: user.email
                }));
            }

            // Execute all creations
            if (promises.length > 0) {
                try {
                    await Promise.all(promises);
                    // Force refresh cache so UI (and Import Wizard) sees them instantly
                    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
                    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
                    console.log("✅ System Initialization Complete");
                } catch (error) {
                    console.error("Failed to seed system defaults:", error);
                }
            }
        };

        seedSystem();
    }, [user, categories?.length, goals?.length, catsLoading, goalsLoading, queryClient]);
};