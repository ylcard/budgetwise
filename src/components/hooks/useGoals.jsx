import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QUERY_KEYS } from './queryKeys';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

/**
 * Hook to fetch all goals for the current user
 */
export const useGoals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.GOALS, user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Goal.filter({ user_email: user.email });
    },
    enabled: !!user?.email,
    initialData: []
  });
};

/**
 * Hook to fetch active goals only
 */
export const useActiveGoals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.GOALS, user?.email, 'active'],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Goal.filter({ 
        user_email: user.email,
        status: 'active'
      });
    },
    enabled: !!user?.email,
    initialData: []
  });
};

/**
 * Hook to create a new goal
 */
export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goalData) => {
      return await base44.entities.Goal.create({
        ...goalData,
        user_email: user.email,
        virtual_balance: 0,
        ledger_history: [],
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
      toast.success('Goal created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create goal: ${error.message}`);
    }
  });
};

/**
 * Hook to update an existing goal
 */
export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Goal.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
      toast.success('Goal updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update goal: ${error.message}`);
    }
  });
};

/**
 * Hook to delete a goal
 */
export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId) => {
      return await base44.entities.Goal.delete(goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
      toast.success('Goal deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete goal: ${error.message}`);
    }
  });
};

/**
 * Hook to add a mental deposit to a goal
 */
export const useAddGoalDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, amount, notes, source = 'manual' }) => {
      const goal = await base44.entities.Goal.get(goalId);
      
      const newDeposit = {
        timestamp: new Date().toISOString(),
        amount,
        period: new Date().toISOString().slice(0, 7),
        source,
        notes: notes || ''
      };

      const updatedHistory = [...(goal.ledger_history || []), newDeposit];
      const updatedBalance = (goal.virtual_balance || 0) + amount;

      return await base44.entities.Goal.update(goalId, {
        ledger_history: updatedHistory,
        virtual_balance: updatedBalance,
        status: updatedBalance >= goal.target_amount ? 'completed' : goal.status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
      toast.success('Mental deposit confirmed');
    },
    onError: (error) => {
      toast.error(`Failed to add deposit: ${error.message}`);
    }
  });
};