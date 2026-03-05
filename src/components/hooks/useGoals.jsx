import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QUERY_KEYS } from './queryKeys';
import { useAuth } from '@/lib/AuthContext';

/**
 * Hook to fetch all goals for the current user
 */
export const useGoals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.SAVINGS_GOALS, user?.email],
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
    queryKey: [QUERY_KEYS.SAVINGS_GOALS, user?.email, 'active'],
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
