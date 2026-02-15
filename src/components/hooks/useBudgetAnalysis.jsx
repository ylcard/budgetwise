/**
 * useBudgetAnalysis Hook
 * CREATED: 16-Jan-2026
 * * Provides methods to trigger the backend historical analysis
 * and access stored budget archetypes.
 */

import { useState } from 'react';
// import { useAuth } from '@base44/react-client'; // Assuming standard Base44 auth hook
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export function useBudgetAnalysis() {
    const { user, updateUser } = useAuth(); // Assuming updateUser allows refetching profile
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    /**
     * Trigger this when a user completes a budget or performs a significant action.
     * It runs in the background and updates the user's metadata.
     */
    const triggerAnalysis = async (silent = false) => {
        setIsAnalyzing(true);
        try {
            // Call the Deno Edge Function
            const response = await fetch(`${import.meta.env.VITE_API_URL}/functions/v1/analyzeHistory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.accessToken}` // Ensure auth is passed
                }
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();

            // Refresh local user data to get the new archetypes immediately
            if (updateUser) await updateUser();

            if (!silent) {
                toast.success("Spending patterns updated", {
                    description: `Found ${data.count} budget templates based on your history.`
                });
            }
            
            return data.archetypes;

        } catch (error) {
            console.error("Budget Analysis Error:", error);
            if (!silent) toast.error("Failed to analyze spending history");
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * Get archetypes directly from user metadata (Instant, no calculation)
     */
    const getStoredArchetypes = () => {
        return user?.privateMetadata?.budgetArchetypes || [];
    };

    return {
        triggerAnalysis,
        getStoredArchetypes,
        isAnalyzing,
        hasArchetypes: (user?.privateMetadata?.budgetArchetypes?.length || 0) > 0
    };
}
