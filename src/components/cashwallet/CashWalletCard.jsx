import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "../utils/SettingsContext";
import { formatCurrency } from "../utils/formatCurrency";

export default function CashWalletCard({ cashWallet, onWithdraw, onDeposit }) {
  const { settings } = useSettings();
  const balance = cashWallet?.balance || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Cash Wallet</CardTitle>
                <p className="text-sm text-gray-600">Physical cash on hand</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className="text-4xl font-bold text-green-700">
                {formatCurrency(balance, settings)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={onWithdraw}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
              <Button
                onClick={onDeposit}
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50"
              >
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                Deposit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}