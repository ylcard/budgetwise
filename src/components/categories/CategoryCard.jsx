import { CustomButton } from "@/components/ui/CustomButton";
import { Pencil, Trash2, Circle, Check, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { iconMap } from "../utils/iconMapConfig";
import { FINANCIAL_PRIORITIES } from "../utils/constants";

export default function CategoryCard({ category, onEdit, onDelete, isSelectionMode, isSelected, onToggle }) {
    const IconComponent = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;
    const priorityConfig = FINANCIAL_PRIORITIES[category.priority] || { label: category.priority, color: '#6b7280' };

    return (
        <motion.div
            initial={false}
            animate={{
                opacity: 1,
                scale: isSelected ? 0.98 : 1,
                borderColor: isSelected ? '#3B82F6' : '#f3f4f6'
            }}
            whileHover={!isSelectionMode ? { scale: 1.02 } : {}}
            onClick={() => isSelectionMode && onToggle()}
            className={`relative h-24 px-4 rounded-xl border transition-all group flex items-center gap-4 ${isSelectionMode ? 'cursor-pointer hover:bg-gray-50' : 'hover:shadow-md'
                } ${isSelected ? 'bg-blue-50 ring-1 ring-blue-500' : ''}`}
            style={!isSelected ? { backgroundColor: `${category.color}05` } : {}}
        >
            {/* Compact Icon - Left Side */}
            <div className="relative">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${category.color}20` }}
                >
                    <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                </div>

                {/* System Lock Icon */}
                {category.is_system && (
                    <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                        <Lock className="w-3 h-3 text-gray-400" />
                    </div>
                )}
            </div>

            {/* Content - Middle */}
            <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 text-sm truncate select-none">{category.name}</h2>
                <p className="text-xs font-medium truncate" style={{ color: priorityConfig.color }}>
                    {priorityConfig.label}
                </p>
            </div>

            {/* Actions - Right Side (Horizontal now) */}
            {isSelectionMode ? (
                <div className="absolute top-3 right-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                        }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                </div>
            ) : (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm">
                    <CustomButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(category)}
                        className="h-6 w-6 hover:bg-blue-50 hover:text-blue-600"
                    >
                        <Pencil className="w-4 h-4" />
                    </CustomButton>
                    <CustomButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(category.id)}
                        className="h-6 w-6 hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </CustomButton>
                </div>
            )}
        </motion.div >
    );
}
