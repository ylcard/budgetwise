import { useState, useEffect, useMemo } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { useFAB } from "../components/hooks/FABContext"; // ADDED 04-Feb-2026
import { useCategories } from "../components/hooks/useBase44Entities";
import { useCategoryActions } from "../components/hooks/useActions";
import CategoryForm from "../components/categories/CategoryForm";
import CategoryGrid from "../components/categories/CategoryGrid";

export default function Categories() {
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const queryClient = useQueryClient();
    const { setFabButtons, clearFabButtons } = useFAB(); // ADDED 04-Feb-2026

    const { categories, isLoading } = useCategories();

    const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useCategoryActions(
        setShowForm,
        setEditingCategory
    );

    // ADDED 04-Feb-2026: FAB button for mobile
    const fabButtons = useMemo(() => [
        {
            key: 'add-category',
            label: 'Add Category',
            icon: 'PlusCircle',
            variant: 'create',
            onClick: () => {
                setEditingCategory(null);
                setShowForm(true);
            }
        }
    ], []);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
    };

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Categories</h1>
                            <p className="text-gray-500 mt-1">Organize your transactions with custom categories</p>
                        </div>
                        {/* UPDATED 04-Feb-2026: Desktop button only (mobile uses FAB) */}
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

                    <CategoryGrid
                        categories={categories}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </PullToRefresh>
    );
}