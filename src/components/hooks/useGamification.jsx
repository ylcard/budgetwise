import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { differenceInCalendarDays } from 'date-fns';
import { normalizeToMidnight } from '../utils/dateUtils';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// CONFIG: 1000 XP per level
const XP_PER_LEVEL = 1000;

/**
 * Hook for managing user gamification (XP, Levels, Streaks).
 * Handles daily streak calculations using timezone-safe date logic.
 */
export const useGamification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * 1. Fetch User Experience Data
   * Uses TanStack Query to cache user stats.
   */
  const { data: userExp, isLoading } = useQuery({
    queryKey: ['userExp', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;

      // Try to find existing record
      const records = await base44.eval('UserExp', {
        filter: { user_email: { _eq: user.email } }
      });

      if (records && records.length > 0) {
        return records[0];
      }

      // Create default record if new user (Seed Logic)
      const newRecord = await base44.create('UserExp', {
        user_email: user.email,
        total_exp: 0,
        current_streak: 0,
        unlocked_rewards: ['default'],
        last_reward: new Date().toISOString()
      });
      return newRecord;
    },
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  /**
   * 2. Add XP Mutation
   * Adds generic XP (e.g., from completing a budget setup) and checks for level-ups.
   */
  const addXPMutation = useMutation({
    mutationFn: async ({ amount }) => {
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

      return await base44.update('UserExp', userExp.id, {
        total_exp: newTotal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userExp', user?.email]);
    }
  });

  /**
   * 3. Daily Streak Logic
   * Checks if the user has logged in/acted today vs their last reward date.
   * Uses normalizeToMidnight to ensure we compare LOCAL CALENDAR DAYS, not 24h windows.
   */
  const checkDailyStreakMutation = useMutation({
    mutationFn: async (wasBudgetMet) => {
      if (!userExp) return;

      // CRITICAL: Normalize to local midnight to prevent 24h rolling window bugs.
      // A streak should count if it's the next calendar day, regardless of hour.
      const lastRewardDate = normalizeToMidnight(userExp.last_reward);
      const today = normalizeToMidnight(new Date());

      if (!lastRewardDate || !today) return;

      const daysDiff = differenceInCalendarDays(today, lastRewardDate);

      // Already claimed today? Do nothing.
      if (daysDiff === 0) return;

      let newStreak = userExp.current_streak;
      let xpGain = 0;
      let message = "";
      let description = "";

      // Logic: Did they engage with the budget positively?
      if (wasBudgetMet) {
        // If diff is 1 (yesterday), increment. If >1, reset to 1.
        newStreak = (daysDiff === 1) ? newStreak + 1 : 1;
        xpGain = 50 + (newStreak * 5); // Base 50 + 5 per streak day
        message = `Daily Goal Met! +${xpGain} XP`;
        description = `${newStreak} day streak! Keep it up.`;
      } else {
        // Streak broken or just a "login" check-in without budget action
        newStreak = 0;
        xpGain = 10; // Pity XP for logging in
        message = "Streak broken, but here's +10 XP for checking in!";
        description = "Try to stick to your budget tomorrow!";
      }

      await base44.update('UserExp', userExp.id, {
        current_streak: newStreak,
        total_exp: (userExp.total_exp || 0) + xpGain,
        last_reward: new Date().toISOString() // Save actual timestamp for audit, calculation uses normalized
      });

      if (xpGain > 0) {
        toast.success(message, { description });
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

  // Progress % for the current level (0 to 100)
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
    checkDailyStreak: checkDailyStreakMutation.mutate
  };
};
