import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Circle, ChevronDown, Search, Check } from "lucide-react"; // Added Icons
import { iconMap, ICON_OPTIONS } from "../utils/iconMapConfig";
import { motion, AnimatePresence } from "framer-motion";
import { PRIORITY_OPTIONS, PRESET_COLORS } from "../utils/constants";

export default function CategoryForm({ category, onSubmit, onCancel, isSubmitting }) {
    const [formData, setFormData] = useState({
        name: '',
        icon: 'Circle',
        color: '#3B82F6',
        priority: 'needs'
    });

    // State for the custom icon picker
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [iconSearchQuery, setIconSearchQuery] = useState("");

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                icon: category.icon || 'Circle',
                color: category.color || '#3B82F6',
                priority: category.priority || 'needs'
            });
        }
    }, [category]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const IconComponent = iconMap[formData.icon] || Circle;

    // Filter icons based on search query
    const filteredIcons = ICON_OPTIONS.filter(option => {
        const searchLower = iconSearchQuery.toLowerCase();
        return (
            option.label.toLowerCase().includes(searchLower) ||
            option.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
    });

    return (
        // 1. The Overlay Backdrop
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onCancel} // Click outside to close
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the form itself
            >
                <Card className="border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                    <CardHeader className="sticky top-0 z-10 bg-white border-b flex flex-row items-center justify-between">
                        <CardTitle>{category ? 'Edit' : 'Create'} Category</CardTitle>
                        <CustomButton variant="ghost" size="icon" onClick={onCancel}>
                            <X className="w-4 h-4" />
                        </CustomButton>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex justify-center">
                                <div
                                    className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg"
                                    style={{ backgroundColor: `${formData.color}20` }}
                                >
                                    <IconComponent className="w-12 h-12" style={{ color: formData.color }} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Category Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Groceries, Entertainment"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Icon Selection</Label>

                                {/* Custom Searchable Dropdown Trigger */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                                        className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1 bg-gray-100 rounded-md">
                                                <IconComponent className="w-5 h-5 text-gray-700" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                {ICON_OPTIONS.find(opt => opt.value === formData.icon)?.label || formData.icon}
                                            </span>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isIconPickerOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Content */}
                                    <AnimatePresence>
                                        {isIconPickerOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute z-50 w-full mt-2 bg-white rounded-lg border shadow-xl overflow-hidden"
                                            >
                                                {/* Search Bar */}
                                                <div className="p-2 border-b bg-gray-50">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                                                        <Input
                                                            autoFocus
                                                            placeholder="Search icons (e.g. food, home)..."
                                                            className="pl-8 h-9 bg-white"
                                                            value={iconSearchQuery}
                                                            onChange={(e) => setIconSearchQuery(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Icon List */}
                                                <div className="max-h-60 overflow-y-auto p-1">
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {filteredIcons.length > 0 ? (
                                                            filteredIcons.map((option) => {
                                                                const OptionIcon = iconMap[option.value] || Circle;
                                                                const isSelected = formData.icon === option.value;
                                                                return (
                                                                    <button
                                                                        key={option.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, icon: option.value });
                                                                            setIsIconPickerOpen(false);
                                                                            setIconSearchQuery("");
                                                                        }}
                                                                        className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <OptionIcon className="w-5 h-5 opacity-70" />
                                                                            <span>{option.label}</span>
                                                                        </div>
                                                                        {isSelected && <Check className="w-4 h-4" />}
                                                                    </button>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="p-4 text-center text-gray-500 text-sm">
                                                                No icons found for "{iconSearchQuery}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${formData.color === color ? 'border-gray-900' : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITY_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                <div>
                                                    <p className="font-medium">{option.label}</p>
                                                    <p className="text-xs text-gray-500">{option.description}</p>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <CustomButton type="button" variant="outline" onClick={onCancel}>
                                    Cancel
                                </CustomButton>
                                <CustomButton
                                    type="submit"
                                    disabled={isSubmitting}
                                    variant="primary"
                                >
                                    {isSubmitting ? 'Saving...' : category ? 'Update' : 'Create'}
                                </CustomButton>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
