import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "../hooks/queryKeys";

export const useCashWalletActions = (user, cashWallet) => {
  const queryClient = useQueryClient();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);

  // Ensure cash wallet exists
  const ensureCashWallet = async () => {
    if (!cashWallet && user) {
      const wallet = await base44.entities.CashWallet.create({
        balance: 0,
        user_email: user.email
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      return wallet;
    }
    return cashWallet;
  };

  // Withdraw cash (Bank -> Wallet)
  const withdrawMutation = useMutation({
    mutationFn: async (data) => {
      const wallet = await ensureCashWallet();
      
      // Create transaction
      await base44.entities.Transaction.create({
        title: data.title,
        amount: data.amount,
        originalAmount: data.amount,
        originalCurrency: user?.baseCurrency || 'USD',
        type: 'expense',
        category_id: data.category_id || null,
        date: data.date,
        isPaid: true,
        paidDate: data.date,
        notes: data.notes || null,
        isCashTransaction: true,
        cashTransactionType: 'withdrawal_to_wallet'
      });

      // Update wallet balance
      await base44.entities.CashWallet.update(wallet.id, {
        balance: wallet.balance + data.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      setShowWithdrawDialog(false);
      showToast({
        title: "Success",
        description: "Cash withdrawn to wallet successfully",
      });
    },
    onError: (error) => {
      console.error('Error withdrawing cash:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to withdraw cash. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Deposit cash (Wallet -> Bank)
  const depositMutation = useMutation({
    mutationFn: async (data) => {
      const wallet = await ensureCashWallet();
      
      if (wallet.balance < data.amount) {
        throw new Error('Insufficient cash in wallet');
      }

      // Create transaction
      await base44.entities.Transaction.create({
        title: data.title,
        amount: data.amount,
        originalAmount: data.amount,
        originalCurrency: user?.baseCurrency || 'USD',
        type: 'income',
        date: data.date,
        notes: data.notes || null,
        isCashTransaction: true,
        cashTransactionType: 'deposit_from_wallet_to_bank'
      });

      // Update wallet balance
      await base44.entities.CashWallet.update(wallet.id, {
        balance: wallet.balance - data.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      setShowDepositDialog(false);
      showToast({
        title: "Success",
        description: "Cash deposited to bank successfully",
      });
    },
    onError: (error) => {
      console.error('Error depositing cash:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to deposit cash. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    showWithdrawDialog,
    setShowWithdrawDialog,
    showDepositDialog,
    setShowDepositDialog,
    handleWithdraw: withdrawMutation.mutate,
    handleDeposit: depositMutation.mutate,
    isWithdrawing: withdrawMutation.isPending,
    isDepositing: depositMutation.isPending,
  };
};