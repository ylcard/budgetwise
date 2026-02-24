import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useAddGoalDeposit } from '../components/hooks/useGoals';
import { useGoalsFeasibility } from '../components/hooks/useFeasibilityAudit';
import { useMonthlyIncome } from '../components/hooks/useDerivedData';
import { usePeriod } from '../components/hooks/usePeriod';
import { useTransactions } from '../components/hooks/useBase44Entities';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalForm } from '../components/goals/GoalForm';
import { GoalDetailDrawer } from '../components/goals/GoalDetailDrawer';
import { GoalSettlementDrawer } from '../components/goals/GoalSettlementDrawer';
import { CustomButton } from '../components/ui/CustomButton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../components/ui/drawer';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Target, Plus, TrendingUp, CheckCircle2, Archive, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { needsSettlement } from '../components/utils/goalCalculations';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import { useIsMobile } from '../hooks/use-mobile';

const STATUS_FILTERS = [
  { value: 'active', label: 'Active', icon: TrendingUp },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
  { value: 'archived', label: 'Archived', icon: Archive }
];

export default function GoalsPage() {
  const { user } = useAuth();
  const { selectedMonth, selectedYear, monthStart, monthEnd } = usePeriod();
  const { transactions = [] } = useTransactions(monthStart, monthEnd);

  const { data: goals = [], isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const addDeposit = useAddGoalDeposit();

  const [statusFilter, setStatusFilter] = useState('active');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [settlementDrawerOpen, setSettlementDrawerOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const isMobile = useIsMobile();

  const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

  // Filter goals by status
  const filteredGoals = useMemo(() => {
    return goals.filter(g => {
      if (statusFilter === 'archived') return g.status === 'archived';
      if (statusFilter === 'completed') return g.status === 'completed';
      return g.status === 'active' || g.status === 'paused';
    });
  }, [goals, statusFilter]);

  // Calculate feasibility for active goals
  const goalsWithFeasibility = useGoalsFeasibility(
    filteredGoals,
    goals, // Pass all goals for accurate commitment math across filters
    transactions,
    selectedMonth,
    selectedYear
  );

  // Check for goals that need settlement
  const goalsNeedingSettlement = useMemo(() => {
    return goals.filter(g => needsSettlement(g));
  }, [goals]);

  const handleCreateGoal = async (goalData) => {
    await createGoal.mutateAsync(goalData);
    setCreateDrawerOpen(false);
  };

  const handleEditGoal = async (goalData) => {
    await updateGoal.mutateAsync({
      id: selectedGoal.id,
      data: goalData
    });
    setEditDrawerOpen(false);
    setSelectedGoal(null);
  };

  const handleTogglePause = async (goal) => {
    const newStatus = goal.status === 'paused' ? 'active' : 'paused';
    await updateGoal.mutateAsync({
      id: goal.id,
      data: { status: newStatus }
    });
    toast.success(`Goal ${newStatus === 'paused' ? 'paused' : 'resumed'}`);
  };

  const handleCompleteGoal = async (goal) => {
    await updateGoal.mutateAsync({
      id: goal.id,
      data: { status: 'completed' }
    });
    setDetailDrawerOpen(false);
    toast.success('🎉 Goal completed! Congratulations!');
  };

  const handleSettlementConfirm = async (depositData) => {
    await addDeposit.mutateAsync({
      goalId: selectedGoal.id,
      ...depositData
    });
  };

  const handleViewDetails = (goal) => {
    setSelectedGoal(goal);
    setDetailDrawerOpen(true);
  };

  const handleEditFromDetail = (goal) => {
    setDetailDrawerOpen(false);
    setSelectedGoal(goal);
    setEditDrawerOpen(true);
  };

  const handleSettlement = (goal) => {
    setSelectedGoal(goal);
    setSettlementDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Target className="w-12 h-12 animate-pulse text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Target className="w-6 h-6" />
                Goals
              </h1>
              <p className="text-sm text-muted-foreground">Track your financial objectives</p>
            </div>
            <CustomButton
              variant="create"
              onClick={() => setCreateDrawerOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </CustomButton>
          </div>

          {/* Status Filter */}
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS.map(f => ({
              value: f.value,
              label: f.label,
              icon: f.icon
            }))}
          />
        </div>
      </div>

      {/* Settlement Alerts */}
      {goalsNeedingSettlement.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <h3 className="text-sm font-medium mb-2">Pending Settlements</h3>
            <div className="space-y-2">
              {goalsNeedingSettlement.map(goal => (
                <div key={goal.id} className="flex items-center justify-between">
                  <span className="text-sm">{goal.title}</span>
                  <CustomButton
                    variant="default"
                    size="sm"
                    onClick={() => handleSettlement(goal)}
                  >
                    Settle Now
                  </CustomButton>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals Carousel/Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {filteredGoals.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No goals yet</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === 'active'
                  ? 'Create your first financial goal to get started'
                  : `No ${statusFilter} goals`}
              </p>
              {statusFilter === 'active' && (
                <CustomButton
                  variant="create"
                  onClick={() => setCreateDrawerOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Goal
                </CustomButton>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="goals"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Desktop: Carousel */}
              <div className="hidden md:block">
                <Carousel className="w-full">
                  <CarouselContent className="-ml-4">
                    {goalsWithFeasibility.map(({ goal, feasibility }) => (
                      <CarouselItem key={goal.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        <GoalCard
                          goal={goal}
                          onClick={() => handleViewDetails(goal)}
                          feasibilityData={feasibility}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>

              {/* Mobile: Grid */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {goalsWithFeasibility.map(({ goal, feasibility }) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onClick={() => handleViewDetails(goal)}
                    feasibilityData={feasibility}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Goal Modal/Drawer */}
      {!isMobile ? (
        <Dialog.Root open={createDrawerOpen} onOpenChange={setCreateDrawerOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-6 shadow-lg rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-bold">Create New Goal</Dialog.Title>
                <Dialog.Close asChild>
                  <CustomButton variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <X className="w-4 h-4" />
                  </CustomButton>
                </Dialog.Close>
              </div>
              <GoalForm onSubmit={handleCreateGoal} onCancel={() => setCreateDrawerOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : (
        <Drawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen}>
          <DrawerContent className="px-4 pb-8">
            <DrawerHeader>
              <DrawerTitle>Create New Goal</DrawerTitle>
            </DrawerHeader>
            <GoalForm onSubmit={handleCreateGoal} onCancel={() => setCreateDrawerOpen(false)} />
          </DrawerContent>
        </Drawer>
      )}

      {/* Edit Goal Modal/Drawer */}
      {!isMobile ? (
        <Dialog.Root open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-6 shadow-lg rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-bold">Edit Goal</Dialog.Title>
                <Dialog.Close asChild>
                  <CustomButton variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <X className="w-4 h-4" />
                  </CustomButton>
                </Dialog.Close>
              </div>
              <GoalForm goal={selectedGoal} onSubmit={handleEditGoal} onCancel={() => setEditDrawerOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : (
        <Drawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
          <DrawerContent className="px-4 pb-8">
            <DrawerHeader>
              <DrawerTitle>Edit Goal</DrawerTitle>
            </DrawerHeader>
            <GoalForm goal={selectedGoal} onSubmit={handleEditGoal} onCancel={() => setEditDrawerOpen(false)} />
          </DrawerContent>
        </Drawer>
      )}

      {/* Goal Detail Drawer */}
      <GoalDetailDrawer
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        goal={selectedGoal}
        feasibilityData={
          selectedGoal
            ? goalsWithFeasibility.find(gf => gf.goal.id === selectedGoal.id)?.feasibility
            : null
        }
        onEdit={handleEditFromDetail}
        onTogglePause={handleTogglePause}
        onComplete={handleCompleteGoal}
        monthlyIncome={monthlyIncome}
      />

      {/* Settlement Drawer */}
      <GoalSettlementDrawer
        open={settlementDrawerOpen}
        onOpenChange={setSettlementDrawerOpen}
        goal={selectedGoal}
        onConfirm={handleSettlementConfirm}
        transactions={transactions}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </div>
  );
}