import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "../utils/currencyCalculations";

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
          <Button
            onClick={onDepositCash}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-xs"
          >
            <ArrowDownToLine className="w-3 h-3 mr-1" />
            Deposit Cash
          </Button>
          <Button
            onClick={onReturnCash}
            size="sm"
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-50 text-xs"
          >
            <ArrowUpFromLine className="w-3 h-3 mr-1" />
            Return Cash
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}