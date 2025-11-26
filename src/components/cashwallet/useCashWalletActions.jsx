// Deprecated, no longer using cash

/*
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "../hooks/queryKeys";
import { calculateConvertedAmount, getRateForDate } from "../utils/currencyCalculations";
*/

/*
export const useCashWalletActions = (user, cashWallet, settings, exchangeRates) => {
    const queryClient = useQueryClient();
    const [depositCashDialogOpen, setDepositCashDialogOpen] = useState(false);
    const [returnCashDialogOpen, setReturnCashDialogOpen] = useState(false);

    // Ensure cash wallet exists
    const ensureCashWallet = async () => {
        if (!cashWallet && user) {
            const wallet = await base44.entities.CashWallet.create({
                balances: [],
                user_email: user.email
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
            return wallet;
        }
        return cashWallet;
    };

    // Helper to update balance for a specific currency
    const updateCurrencyBalance = (balances, currencyCode, amountChange) => {
        const existingBalance = balances.find(b => b.currencyCode === currencyCode);

        if (existingBalance) {
            return balances.map(b =>
                b.currencyCode === currencyCode
                    ? { ...b, amount: b.amount + amountChange }
                    : b
            );
        } else {
            return [...balances, { currencyCode, amount: amountChange }];
        }
    };

    // Deposit Cash (Bank -> Wallet)
    const depositCashMutation = useMutation({
        mutationFn: async (data) => {
            const wallet = await ensureCashWallet();

            // Convert amount to base currency for the transaction expense
            const baseCurrency = settings?.baseCurrency || 'USD';
            let convertedAmount = data.amount;
            let exchangeRateUsed = null;

            if (data.currency !== baseCurrency) {
                const sourceRate = getRateForDate(exchangeRates, data.currency, data.date);
                const targetRate = getRateForDate(exchangeRates, baseCurrency, data.date);

                if (sourceRate && targetRate) {
                    const conversion = calculateConvertedAmount(
                        data.amount,
                        data.currency,
                        baseCurrency,
                        { sourceToUSD: sourceRate, targetToUSD: targetRate }
                    );
                    convertedAmount = conversion.convertedAmount;
                    exchangeRateUsed = conversion.exchangeRateUsed;
                }
            }

            // Create transaction (as expense in base currency)
            await base44.entities.Transaction.create({
                title: data.title,
                amount: convertedAmount,
                originalAmount: data.amount,
                originalCurrency: data.currency,
                exchangeRateUsed: exchangeRateUsed,
                type: 'expense',
                category_id: data.category_id || null,
                date: data.date,
                isPaid: true,
                paidDate: data.date,
                notes: data.notes || null,
                isCashTransaction: false,
                cashTransactionType: 'withdrawal_to_wallet',
                cashAmount: data.amount,
                cashCurrency: data.currency
            });

            // Update wallet balance in the specific currency
            const updatedBalances = updateCurrencyBalance(
                wallet.balances || [],
                data.currency,
                data.amount
            );

            await base44.entities.CashWallet.update(wallet.id, {
                balances: updatedBalances
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
            setDepositCashDialogOpen(false);
            showToast({
                title: "Success",
                description: "Cash deposited to wallet successfully",
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

    // Return Cash (Wallet -> Bank)
    const returnCashMutation = useMutation({
        mutationFn: async (data) => {
            const wallet = await ensureCashWallet();
            const balances = wallet.balances || [];
            const currencyBalance = balances.find(b => b.currencyCode === data.currency);

            if (!currencyBalance || currencyBalance.amount < data.amount) {
                throw new Error('Insufficient cash in wallet for this currency');
            }

            // Convert amount to base currency for the transaction income
            const baseCurrency = settings?.baseCurrency || 'USD';
            let convertedAmount = data.amount;
            let exchangeRateUsed = null;

            if (data.currency !== baseCurrency) {
                const sourceRate = getRateForDate(exchangeRates, data.currency, data.date);
                const targetRate = getRateForDate(exchangeRates, baseCurrency, data.date);

                if (sourceRate && targetRate) {
                    const conversion = calculateConvertedAmount(
                        data.amount,
                        data.currency,
                        baseCurrency,
                        { sourceToUSD: sourceRate, targetToUSD: targetRate }
                    );
                    convertedAmount = conversion.convertedAmount;
                    exchangeRateUsed = conversion.exchangeRateUsed;
                }
            }

            // Create transaction (as income in base currency)
            await base44.entities.Transaction.create({
                title: data.title,
                amount: convertedAmount,
                originalAmount: data.amount,
                originalCurrency: data.currency,
                exchangeRateUsed: exchangeRateUsed,
                type: 'income',
                date: data.date,
                notes: data.notes || null,
                isCashTransaction: true,
                cashTransactionType: 'deposit_from_wallet_to_bank',
                cashAmount: data.amount,
                cashCurrency: data.currency
            });

            // Update wallet balance
            const updatedBalances = updateCurrencyBalance(
                balances,
                data.currency,
                -data.amount
            ).filter(b => b.amount > 0.01); // Remove zero/near-zero balances

            await base44.entities.CashWallet.update(wallet.id, {
                balances: updatedBalances
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
            setReturnCashDialogOpen(false);
            showToast({
                title: "Success",
                description: "Cash returned to bank successfully",
            });
        },
        onError: (error) => {
            console.error('Error returning cash:', error);
            showToast({
                title: "Error",
                description: error?.message || "Failed to return cash. Please try again.",
                variant: "destructive",
            });
        },
    });

    return {
        depositCashDialogOpen,
        setDepositCashDialogOpen,
        returnCashDialogOpen,
        setReturnCashDialogOpen,
        openDepositCashDialog: () => setDepositCashDialogOpen(true),
        openReturnCashDialog: () => setReturnCashDialogOpen(true),
        handleDepositCash: depositCashMutation.mutate,
        handleReturnCash: returnCashMutation.mutate,
        isDepositingCash: depositCashMutation.isPending,
        isReturningCash: returnCashMutation.isPending,
    };
};
*/
