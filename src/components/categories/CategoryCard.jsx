import React from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Pencil, Trash2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { iconMap } from "../utils/iconMapConfig";

export default function CategoryCard({ category, onEdit, onDelete }) {
    const IconComponent = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="relative p-3 rounded-lg border border-gray-100 hover:shadow-md transition-all group flex items-center gap-3"
            style={{ backgroundColor: `${category.color}05` }}
        >
            {/* Compact Icon - Left Side */}
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${category.color}20` }}
            >
                <IconComponent className="w-5 h-5" style={{ color: category.color }} />
            </div>

            {/* Content - Middle */}
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm truncate">{category.name}</h3>
                <p className="text-xs text-gray-500 capitalize truncate">{category.priority}</p>
            </div>

            {/* Actions - Right Side (Horizontal now) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <CustomButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(category)}
                    className="h-4 w-4 hover:bg-blue-50 hover:text-blue-600"
                >
                    <Pencil className="w-4 h-4" />
                </CustomButton>
                <CustomButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(category.id)}
                    className="h-4 w-4 hover:bg-red-50 hover:text-red-600"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </CustomButton>
            </div>
        </motion.div>
    );
}
