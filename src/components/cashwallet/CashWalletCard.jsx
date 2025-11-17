import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// COMMENTED OUT 16-Jan-2025: Replaced with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "../utils/constants";

export default function CashWalletCard({ cashWallet, onDepositCash, onReturnCash }) {
  const balances = cashWallet?.balances || [];

  return (
    <Card className="h-full bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Cash Wallet</CardTitle>
            <p className="text-xs text-gray-600">Physical cash</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {balances.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">No cash yet</p>
        ) : (
          <div className="space-y-1">
            {balances.map((balance) => {
              const currency = SUPPORTED_CURRENCIES.find(c => c.code === balance.currencyCode);
              const symbol = currency?.symbol || balance.currencyCode;
              return (
                <div key={balance.currencyCode} className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">{balance.currencyCode}</span>
                  <span className="text-lg font-bold text-green-700">
                    {symbol}{balance.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <CustomButton
            onClick={onDepositCash}
            size="sm"
            variant="primary"
            className="text-xs"
          >
            <ArrowDownToLine className="w-3 h-3 mr-1" />
            Deposit Cash
          </CustomButton>
          <CustomButton
            onClick={onReturnCash}
            size="sm"
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-50 text-xs"
          >
            <ArrowUpFromLine className="w-3 h-3 mr-1" />
            Return Cash
          </CustomButton>
        </div>
      </CardContent>
    </Card>
  );
}

// UPDATED 16-Jan-2025: Replaced Button with CustomButton for cash wallet actions
// - Deposit Cash button uses variant="primary" (gradient blue-purple)
// - Return Cash button uses variant="outline" with custom green border and text colors
// - All functionality preserved with consistent styling