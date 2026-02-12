import { useEffect, useRef } from 'react';
import { useCategories, useGoals, useSystemActions } from '@/components/hooks/useBase44Entities';

export const useSystemSetup = (user) => {
    const { categories, isLoading: catsLoading } = useCategories();
    const { goals, isLoading: goalsLoading } = useGoals(user);
    const { initializeSystem } = useSystemActions(user);

    // Prevent multiple simultaneous initializations if network is slow
    const isInitializing = useRef(false);

    useEffect(() => {
        const checkAndInit = async () => {
            if (!user || catsLoading || goalsLoading || isInitializing.current) return;

            // Definition of a "New User": No categories AND no goals
            if (categories?.length === 0 && goals?.length === 0) {
                isInitializing.current = true;
                await initializeSystem();
                isInitializing.current = false;
            }
        };

        checkAndInit();
    }, [user, categories?.length, goals?.length, catsLoading, goalsLoading]);
};