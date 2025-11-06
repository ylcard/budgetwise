import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "../utils/formatCurrency";
import { iconMap } from "../utils/iconMapConfig";

export default function AllocationCard({ allocation, category, stats, settings, onEdit, onDelete }) {
  const IconComponent = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;
  
  // Calculate circle stroke for progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percentageUsed / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className="border-none shadow-lg hover:shadow-xl transition-all h-full group">
        <CardContent className="p-6 flex flex-col h-full min-h-[200px]">
          {/* Action buttons */}
          <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(allocation)}
              className="hover:bg-blue-50 hover:text-blue-600 h-7 w-7"
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(allocation.id)}
              className="hover:bg-red-50 hover:text-red-600 h-7 w-7"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          {/* Circular progress with icon */}
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke={category.color}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <IconComponent className="w-8 h-8" style={{ color: category.color }} />
              </div>
            </div>
          </div>

          {/* Category info */}
          <div className="text-center flex-1 flex flex-col justify-center">
            <p className="font-bold text-gray-900 text-base mb-1">{category.name}</p>
            <p className="text-2xl font-bold mb-1" style={{ color: category.color }}>
              {formatCurrency(stats.remaining, settings)}
            </p>
            <p className="text-xs text-gray-500 mb-2">
              of {formatCurrency(stats.allocated, settings)}
            </p>
            <p className="text-xs font-semibold text-gray-600">
              {stats.percentageUsed.toFixed(0)}% used
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}