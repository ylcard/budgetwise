import { useState, useMemo, useEffect } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, Trash2, Pencil, CheckSquare, X, Check, Lock, CheckCheck } from "lucide-react";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { useMergedCategories } from "../components/hooks/useMergedCategories";
import { useCategoryActions } from "../components/hooks/useActions";
import CategoryForm from "../components/categories/CategoryForm";
import CategoryGrid from "../components/categories/CategoryGrid";
import { useFAB } from "../components/hooks/FABContext";
import { showToast } from "@/components/ui/use-toast";
import { getCategoryIcon } from "../components/utils/iconMapConfig";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function Categories() {
    // UI state
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const queryClient = useQueryClient();
    const { setFabButtons, clearFabButtons } = useFAB();
    const { user } = useAuth();

    // UPDATED 14-Feb-2026: Fetch merged system + custom categories
    const { categories: allCategories, isLoading } = useMergedCategories();
    const categories = allCategories; // Use merged for display

    // Admin check
    const isAdmin = user?.role === 'admin';

    // Split categories for the new UI
    const { systemCategories, customCategories: userCategories } = useMemo(() => {
        const sys = [];
        const cust = [];
        (categories || []).forEach(cat => {
            if (cat.isSystemCategory) sys.push(cat);
            else cust.push(cat);
        });

        // Sort both: Priority first, then Alphabetical
        const sorter = (a, b) => a.name.localeCompare(b.name);
        return { systemCategories: sys.sort(sorter), customCategories: cust.sort(sorter) };
    }, [categories]);

    // Actions (mutations and handlers)
    const { handleSubmit: performMutation, handleEdit, handleDelete, handleBulkDelete: executeBulkDelete, isSubmitting } = useCategoryActions(
        setShowForm,
        setEditingCategory
    );

    // WRAPPED SUBMIT: Validation Logic
    const handleSubmit = (data, editingCategory) => {
        // Check for duplicates in System Categories (Name + Priority match)
        // We only check if we are creating a NEW category (editingCategory is null)
        // or if we are renaming an existing one.
        if (!editingCategory || editingCategory.name !== data.name) {
            const duplicate = systemCategories.find(sys =>
                sys.name.toLowerCase() === data.name.toLowerCase() &&
                sys.priority === data.priority
            );

            if (duplicate) {
                showToast({
                    title: "Duplicate Category",
                    description: `A system category named "${duplicate.name}" already exists in "${duplicate.priority}".`,
                    variant: "destructive"
                });
                return;
            }
        }

        performMutation(data, editingCategory);
    };

    // UPDATED 14-Feb-2026: Prevent deletion of system categories
    const onSafeDelete = (category) => {
        // ADDED 14-Feb-2026: Block deletion of system categories
        if (category.isSystemCategory) {
            showToast({
                title: "Cannot Delete",
                description: `"${category.name}" is a system category and cannot be deleted.`,
                variant: "destructive"
            });
            return;
        }

        // The hook handles the confirmation dialog, db call, invalidation, and toast!
        handleDelete(category);
    };

    // SELECTION LOGIC
    const handleToggleSelection = (id, isSelected) => {
        const newSelected = new Set(selectedIds);
        if (isSelected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);

        if (newSelected.size > 0 && !isSelectionMode) {
            setIsSelectionMode(true);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === categories.length) {
            setSelectedIds(new Set()); // Deselect all
        } else {
            const allIds = new Set(categories.map(c => c.id));
            setSelectedIds(allIds);
        }
    };

    // Helper for chunking arrays
    const chunkArray = (array, size) => {
        const chunked = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    };


    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        // ADDED 14-Feb-2026: Filter out system categories from deletion
        const selectedCategories = categories.filter(c => selectedIds.has(c.id));
        const systemCategories = selectedCategories.filter(c => c.isSystemCategory);
        const customCategoriesIds = selectedCategories
            .filter(c => !c.isSystemCategory)
            .map(c => c.id);

        if (systemCategories.length > 0) {
            showToast({
                title: "System Categories Excluded",
                description: `${systemCategories.length} system categories cannot be deleted and will be skipped.`,
                variant: "warning"
            });
        }

        if (customCategoriesIds.length === 0) {
            showToast({
                title: "No Deletable Categories",
                description: "You can only delete custom categories, not system categories.",
                variant: "destructive"
            });
            return;
        }

        if (window.confirm(`Delete ${customCategoriesIds.length} custom categories? This cannot be undone.`)) {
            // The hook handles the deleteMany call, invalidation, and toasts
            executeBulkDelete(customCategoriesIds);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    // UPDATED 14-Feb-2026: Pull-to-refresh for both system and custom categories
    const handleRefresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] }),
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_CATEGORIES] })
        ]);
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
    ], [setEditingCategory, setShowForm]);

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
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {/* Selection Mode Controls */}
                            {isSelectionMode ? (
                                <>
                                    <CustomButton
                                        variant="outline"
                                        onClick={handleSelectAll}
                                        className="hidden md:flex"
                                    >
                                        <CheckCheck className="w-4 h-4 mr-2" />
                                        {selectedIds.size === categories?.length ? "Deselect All" : "Select All"}
                                    </CustomButton>
                                    <CustomButton
                                        variant="outline"
                                        onClick={() => {
                                            setIsSelectionMode(false);
                                            setSelectedIds(new Set());
                                        }}
                                    >
                                        <X className="w-4 h-4 mr-2" /> Cancel
                                    </CustomButton>
                                    <CustomButton
                                        variant="destructive"
                                        onClick={handleBulkDelete}
                                        disabled={selectedIds.size === 0 || isBulkDeleting}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {isBulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                                    </CustomButton>
                                </>
                            ) : (
                                <>
                                    <CustomButton
                                        onClick={() => setIsSelectionMode(true)}
                                        variant="ghost"
                                        className="text-gray-600"
                                    >
                                        <CheckSquare className="w-4 h-4 mr-2" /> Select
                                    </CustomButton>
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
                                </>
                            )}
                        </div>
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
                            systemCategories={systemCategories}
                            customCategories={userCategories}
                            onEdit={handleEdit}
                            onDelete={onSafeDelete}
                            isLoading={isLoading}
                            isSelectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelection={handleToggleSelection}
                            onSelectionChange={setSelectedIds}
                            isAdmin={isAdmin}
                        />
                    </div>

                    {/* MOBILE DENSE LIST */}
                    <div className="md:hidden space-y-2 pb-24">
                        {isLoading ? (
                            <p className="text-center text-gray-500 py-8">Loading categories...</p>
                        ) : [...userCategories, ...systemCategories].map((cat) => (
                            <MobileCategoryItem
                                key={cat.id}
                                category={cat}
                                onEdit={handleEdit}
                                onDelete={onSafeDelete}
                                isSelectionMode={isSelectionMode}
                                selectedIds={selectedIds}
                                onToggle={() => handleToggleSelection(cat.id, !selectedIds.has(cat.id))}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </PullToRefresh>
    );
}

function MobileCategoryItem({ category, onEdit, onDelete, isSelectionMode, selectedIds, onToggle, isAdmin }) {
    // Use your existing helper to resolve the icon component
    const Icon = getCategoryIcon(category.icon);
    const isSelected = selectedIds.has(category.id);
    const hasSelection = selectedIds.size > 0;

    const handleRowClick = () => {
        if (hasSelection) {
            onToggle();
        } else {
            onEdit(category);
        }
    };

    return (
        <div
            onClick={handleRowClick}
            className={`flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm transition-all ${hasSelection ? 'active:scale-98 cursor-pointer' : ''
                } ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-100'
                } ${''
                }`}
        >
            <div className="flex items-center gap-3">
                {hasSelection && (
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                        }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                )}

                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm relative"
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                >
                    <Icon className="w-5 h-5" />
                    {/* System Icon Indicator */}
                    {category.is_system && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                            <Lock className="w-3 h-3 text-gray-400" />
                        </div>
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        {/* ADDED 14-Feb-2026: System category badge */}
                        {category.isSystemCategory && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">System</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">{category.priority || 'No priority'}</p>
                </div>
            </div>

            {/* UPDATED 14-Feb-2026: Disable edit/delete for system categories */}
            {!hasSelection && (!category.isSystemCategory || isAdmin) && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>

                    {!category.isSystemCategory && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}

            {/* ADDED 14-Feb-2026: Lock icon for system categories */}
            {!hasSelection && category.isSystemCategory && (
                <div className="flex items-center gap-1 text-gray-400">
                    <Lock className="w-4 h-4" />
                </div>
            )}
        </div>
    );
}