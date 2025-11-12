import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js
import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils";
import { iconMap } from "../utils/iconMapConfig";

export default function AllocationCard({ allocation, category, stats, onEdit, onDelete, settings }) {
  const IconComponent = category?.icon && iconMap[category.icon] ? iconMap[category.icon] : null;
  const isCash = allocation.allocationType === 'cash';
  const currency = allocation.currency || settings?.baseCurrency || 'USD';
  const currencySymbol = isCash ? getCurrencySymbol(currency) : settings?.currencySymbol;
  
  const allocated = allocation.allocatedAmount || 0;
  const spent = stats?.spent || 0;
  const remaining = stats?.remaining || 0;
  const percentageUsed = stats?.percentageUsed || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="border-none shadow-md hover:shadow-lg transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              {IconComponent && (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{category?.name || 'Unknown'}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {isCash ? 'Cash' : 'Card'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={onEdit} className="hover:bg-blue-50 hover:text-blue-600  h-7 w-7 rounded flex items-center justify-center">
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} className="hover:bg-red-50 hover:text-red-600 h-7 w-7 rounded flex items-center justify-center">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Allocated</span>
              <span className="font-semibold">
                {formatCurrency(allocated, { ...settings, currencySymbol })}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Spent</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(spent, { ...settings, currencySymbol })}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Remaining</span>
              <span className={`font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(remaining, { ...settings, currencySymbol })}
              </span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>Usage</span>
                <span>{percentageUsed.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(percentageUsed, 100)}%`,
                    backgroundColor: percentageUsed > 100 ? '#EF4444' : percentageUsed > 80 ? '#F59E0B' : '#10B981'
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ENHANCEMENT (2025-01-11):
// Added support for displaying allocation type (Cash vs Card) with badge
// Shows currency for cash allocations
// Uses correct currency symbol based on allocation type
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js