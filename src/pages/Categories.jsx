import { useState, useMemo, useEffect } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, MoreVertical, Lock, Trash2, Pencil } from "lucide-react";
import { PullToRefresh } from "../components/ui/PullToRefresh"; // ADDED 03-Feb-2026: Native-style pull-to-refresh
import { useQueryClient } from "@tanstack/react-query"; // ADDED 03-Feb-2026: For manual refresh
import { QUERY_KEYS } from "../components/hooks/queryKeys"; // ADDED 03-Feb-2026: For query invalidation
import { useCategories } from "../components/hooks/useBase44Entities";
import { useCategoryActions } from "../components/hooks/useActions";
import CategoryForm from "../components/categories/CategoryForm";
import CategoryGrid from "../components/categories/CategoryGrid";
import { useFAB } from "../components/hooks/FABContext";
import { showToast } from "@/components/ui/use-toast";
import { getCategoryIcon } from "../components/utils/iconMapConfig";

export default function Categories() {
    // UI state
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const queryClient = useQueryClient();
    const { setFabButtons, clearFabButtons } = useFAB();

    // Data fetching
    const { categories, isLoading } = useCategories();

    // Sort alphabetically A-Z
    const sortedCategories = useMemo(() => {
        return [...(categories || [])].sort((a, b) => a.name.localeCompare(b.name));
    }, [categories]);

    // Actions (mutations and handlers)
    const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useCategoryActions(
        setShowForm,
        setEditingCategory
    );

    // SYSTEM CATEGORY SAFEGUARD
    const onSafeDelete = (category) => {
        if (category.is_system) {
            showToast({
                title: "Action Denied",
                description: "System categories cannot be deleted.",
                variant: "destructive"
            });
            return;
        }
        handleDelete(category);
    };

    // ADDED 03-Feb-2026: Pull-to-refresh handler
    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
    };

    // FAB Configuration
    const fabButtons = useMemo(() => [
        {
            key: 'add-category',
            label: 'Add Category',
            icon: 'PlusCircle',
            variant: 'create',
            onClick: () => {
                setEditingCategory(null);
                setShowForm(true); // Always open, don't toggle from FAB
            }
        }
    ], []);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Categories</h1>
                            <p className="text-gray-500 mt-1">Organize your transactions with custom categories</p>
                        </div>
                        <CustomButton
                            onClick={() => {
                                setEditingCategory(null);
                                setShowForm(!showForm);
                            }}
                            variant="create"
                            className="hidden md:flex"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Category
                        </CustomButton>
                    </div>

                    {showForm && (
                        <CategoryForm
                            category={editingCategory}
                            onSubmit={(data) => handleSubmit(data, editingCategory)}
                            onCancel={() => {
                                setShowForm(false);
                                setEditingCategory(null);
                            }}
                            isSubmitting={isSubmitting}
                        />
                    )}

                    {/* DESKTOP GRID */}
                    <div className="hidden md:block">
                        <CategoryGrid
                            categories={sortedCategories}
                            onEdit={handleEdit}
                            onDelete={onSafeDelete}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* MOBILE DENSE LIST */}
                    <div className="md:hidden space-y-2 pb-24">
                        {isLoading ? (
                            <p className="text-center text-gray-500 py-8">Loading categories...</p>
                        ) : sortedCategories.map((cat) => (
                            <MobileCategoryItem
                                key={cat.id}
                                category={cat}
                                onEdit={handleEdit}
                                onDelete={onSafeDelete}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </PullToRefresh>
    );
}

function MobileCategoryItem({ category, onEdit, onDelete }) {
    // Use your existing helper to resolve the icon component
    const Icon = getCategoryIcon(category.icon);

    return (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                >
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{category.type}</p>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onEdit(category)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                    <Pencil className="w-5 h-5" />
                </button>

                {!category.is_system && (
                    <button
                        onClick={() => onDelete(category)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
