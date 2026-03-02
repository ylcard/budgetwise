import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { differenceInCalendarDays } from 'date-fns';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// CONFIG: Leveling Curve (Linear: 1000 XP per level for simplicity & steady progress)
const XP_PER_LEVEL = 1000;

export const useGamification = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch User Experience Data
    const { data: userExp, isLoading } = useQuery({
        queryKey: ['userExp', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;

            // Try to find existing record
            const records = await base44.entities.UserExp.filter({ user_email: user.email });

            if (records && records.length > 0) {
                return records[0];
            }

            // Create default record if new user
            const newRecord = await base44.entities.UserExp.create({
                user_email: user.email,
                total_exp: 0,
                current_streak: 0,
                unlocked_rewards: ['default'],
                last_reward: new Date().toISOString() // Set to now to prevent instant double-dip
            });
            return newRecord;
        },
        enabled: !!user?.email,
        staleTime: 1000 * 60 * 5, // 5 mins
    });

    // 2. Add XP Mutation
    const addXPMutation = useMutation({
        mutationFn: async ({ amount, reason }) => {
            if (!userExp) return;

            const newTotal = (userExp.total_exp || 0) + amount;

            // Check for Level Up
            const oldLevel = Math.floor((userExp.total_exp || 0) / XP_PER_LEVEL) + 1;
            const newLevel = Math.floor(newTotal / XP_PER_LEVEL) + 1;

            if (newLevel > oldLevel) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10B981', '#F59E0B', '#3B82F6']
                });
                toast.success(`Level Up! You are now Level ${newLevel}`, {
                    description: "Keep saving to unlock more rewards!",
                    icon: "🎉"
                });
            }

            return await base44.entities.UserExp.update(userExp.id, {
                total_exp: newTotal
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['userExp', user?.email]);
        }
    });

    // 3. Daily Streak Logic
    const checkDailyStreak = useMutation({
        mutationFn: async (wasBudgetMet) => {
            if (!userExp) return;

            const lastRewardDate = new Date(userExp.last_reward);
            const today = new Date();
            const daysDiff = differenceInCalendarDays(today, lastRewardDate);

            // Already claimed today?
            if (daysDiff === 0) return;

            let newStreak = userExp.current_streak;
            let xpGain = 0;

            if (wasBudgetMet) {
                // Streak continues or starts
                newStreak = (daysDiff === 1) ? newStreak + 1 : 1;
                xpGain = 50 + (newStreak * 5); // Base 50 + 5 per streak day
            } else {
                // Streak broken
                newStreak = 0;
                xpGain = 10; // Pity XP for logging in
            }

            await base44.entities.UserExp.update(userExp.id, {
                current_streak: newStreak,
                total_exp: (userExp.total_exp || 0) + xpGain,
                last_reward: today.toISOString()
            });

            if (wasBudgetMet) {
                toast.success("Daily Budget Goal Met!", { description: `+${xpGain} XP (Streak: ${newStreak})` });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['userExp', user?.email]);
        }
    });

    // Derived State
    const totalExp = userExp?.total_exp || 0;
    const currentLevel = Math.floor(totalExp / XP_PER_LEVEL) + 1;
    const nextLevelExp = currentLevel * XP_PER_LEVEL;
    const currentLevelStartExp = (currentLevel - 1) * XP_PER_LEVEL;

    // Progress for the current level (0 to 100)
    const levelProgress = Math.min(100, Math.max(0,
        ((totalExp - currentLevelStartExp) / (nextLevelExp - currentLevelStartExp)) * 100
    ));

    return {
        userExp,
        isLoading,
        level: currentLevel,
        progress: levelProgress,
        nextLevelExp,
        currentExp: totalExp,
        streak: userExp?.current_streak || 0,
        addXP: addXPMutation.mutate,
        checkDailyStreak: checkDailyStreak.mutate
    };
};