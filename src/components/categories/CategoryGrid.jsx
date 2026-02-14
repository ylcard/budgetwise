import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Box, Lock, Trash2, AlertTriangle } from "lucide-react";
import { iconMap } from "../utils/iconMapConfig";

export default function CategoryGrid({ systemCategories = [], customCategories = [], onEdit, onDelete, isLoading, isSelectionMode, selectedIds, onToggleSelection, onSelectionChange, isAdmin }) {
    // View State ('custom' | 'system')
    const [activeTab, setActiveTab] = useState('custom');

    // Drag Selection State
    const [selectionBox, setSelectionBox] = useState(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const cardRefs = useRef(new Map());
    const initialSelection = useRef(new Set());

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, categoryId: null, categoryName: '' });

    // Register card refs
    const setCardRef = useCallback((id, node) => {
        if (node) {
            cardRefs.current.set(id, node);
        } else {
            cardRefs.current.delete(id);
        }
    }, []);

    // Mouse Event Handlers for Drag Selection
    const handleMouseDown = (e) => {
        // Only enable drag selection in selection mode and if left clicking
        if (!isSelectionMode || selectedIds.size === 0 || e.button !== 0) return;

        // Don't start drag if clicking a button inside the card
        if (e.target.closest('button')) return;

        isDragging.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        initialSelection.current = new Set(selectedIds);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current) return;

        const currentX = e.clientX;
        const currentY = e.clientY;
        const startX = startPos.current.x;
        const startY = startPos.current.y;

        // Calculate selection box dimensions (viewport relative)
        const box = {
            left: Math.min(startX, currentX),
            top: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY)
        };

        setSelectionBox(box);

        // Collision Detection
        const newSelection = new Set(initialSelection.current);

        cardRefs.current.forEach((node, id) => {
            const rect = node.getBoundingClientRect();

            // Check intersection
            const isIntersecting = !(
                rect.right < box.left ||
                rect.left > box.left + box.width ||
                rect.bottom < box.top ||
                rect.top > box.top + box.height
            );

            if (isIntersecting) {
                newSelection.add(id);
            } else if (!initialSelection.current.has(id)) {
                // If not in initial selection and no longer intersecting, remove it
                // (This allows toggling behavior if we started with some selected)
                newSelection.delete(id);
            }
        });

        if (onSelectionChange) {
            onSelectionChange(newSelection);
        }
    }, [onSelectionChange]);

    const handleMouseUp = () => {
        isDragging.current = false;
        setSelectionBox(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove]);

    const handleDeleteRequest = (id, name) => {
        setDeleteConfirm({ isOpen: true, categoryId: id, categoryName: name });
    };

    const handleConfirmDelete = () => {
        if (deleteConfirm.categoryId) {
            onDelete(deleteConfirm.categoryId);
            setDeleteConfirm({ isOpen: false, categoryId: null, categoryName: '' });
        }
    };

    // Helper to render a group of categories in the "Bento" style
    const renderCategoryGroup = (categories, groupType) => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['needs', 'wants', 'savings'].map(priority => {
                    const priorityCats = categories.filter(c => c.priority === priority);
                    if (priorityCats.length === 0) return null;

                    return (
                        <div key={priority} className="space-y-3">
                            <h3 className="font-semibold capitalize text-gray-500 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FINANCIAL_PRIORITIES[priority].color }}></span>
                                {priority}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {priorityCats.map(cat => (
                                    <CategoryPill
                                        key={cat.id}
                                        ref={(node) => setCardRef(cat.id, node)}
                                        category={cat}
                                        isSystem={groupType === 'system'}
                                        isAdmin={isAdmin}
                                        onEdit={onEdit}
                                        onRequestDelete={handleDeleteRequest}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIds?.has(cat.id)}
                                        onToggle={() => onToggleSelection(cat.id, !selectedIds?.has(cat.id))}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (isLoading) {
        return <CategorySkeleton />;
    }

    const currentCategories = activeTab === 'custom' ? customCategories : systemCategories;

    return (
        <>
            {createPortal(
                <DeleteConfirmationDialog
                    isOpen={deleteConfirm.isOpen}
                    onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                    onConfirm={handleConfirmDelete}
                    categoryName={deleteConfirm.categoryName}
                />,
                document.body
            )}
            <Card className="border-none shadow-lg relative select-none bg-transparent shadow-none" ref={containerRef} onMouseDown={handleMouseDown}>
                {/* Selection Overlay */}
                {selectionBox && (
                    <div
                        className="fixed z-50 bg-blue-500/10 border border-blue-500 pointer-events-none"
                        style={{
                            left: selectionBox.left,
                            top: selectionBox.top,
                            width: selectionBox.width,
                            height: selectionBox.height
                        }}
                    />
                )}
                <CardHeader className="px-0 pt-0 pb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* Header Title */}
                        <div>
                            <CardTitle className="text-xl">
                                {activeTab === 'custom' ? 'My Categories' : 'System Defaults'}
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({currentCategories.length})
                                </span>
                            </CardTitle>
                        </div>

                        {/* Segmented Control */}
                        <div className="bg-gray-100/80 p-1 rounded-lg flex items-center gap-1">
                            <TabButton
                                isActive={activeTab === 'custom'}
                                onClick={() => setActiveTab('custom')}
                                icon={Layers}
                                label="Custom"
                                count={customCategories.length}
                            />
                            <TabButton
                                isActive={activeTab === 'system'}
                                onClick={() => setActiveTab('system')}
                                icon={Box}
                                label="System"
                                count={systemCategories.length}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <AnimatePresence mode="wait">
                        {activeTab === 'custom' ? (
                            <motion.div
                                key="custom"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {customCategories.length > 0 ? (
                                    renderCategoryGroup(customCategories, 'custom')
                                ) : (
                                    <EmptyState type="custom" />
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="system"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderCategoryGroup(systemCategories, 'system')}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </>
    );
}

// Sub-components

function TabButton({ isActive, onClick, icon: Icon, label, count }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

const CategoryPill = forwardRef(({ category, isSystem, isAdmin, onEdit, onRequestDelete, isSelectionMode, isSelected, onToggle }, ref) => {
    const Icon = iconMap[category.icon] || Box;

    const handleClick = (e) => {
        if (isSelectionMode) {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
            return;
        }
        if ((isSystem && isAdmin) || (!isSystem)) {
            onEdit(category);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onRequestDelete(category.id, category.name);
    };

    return (
        <div
            ref={ref}
            onClick={handleClick}
            style={{ '--category-color': category.color }}
            className={`group flex items-center gap-2 px-3 py-2 rounded-xl bg-white border shadow-sm transition-all cursor-pointer relative select-none
                ${isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-[var(--category-color)] hover:bg-[var(--category-color)]/5 hover:shadow-md'
                }
                ${isSystem && !isAdmin ? 'opacity-80 cursor-default hover:border-gray-100 hover:shadow-none' : ''}
            `}
        >
            <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                style={{ backgroundColor: `${category.color}20`, color: category.color }}
            >
                <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-medium text-gray-700">{category.name}</span>
            {isSystem && isAdmin && (
                <Lock className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors ml-1" />
            )}
            {!isSystem && !isSelectionMode && (
                <button onClick={handleDelete} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-all ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
});

function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, categoryName }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 relative z-[10000]">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Category?</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        Are you sure you want to remove <span className="font-semibold text-gray-900">{categoryName}</span>?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={onConfirm} className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-md shadow-red-200 transition-all">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ type }) {
    return (
        <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
            <Layers className="w-10 h-10 mb-3 opacity-20" />
            <p className="font-medium">No custom categories yet</p>
            <p className="text-sm mt-1">Create one to get started!</p>
        </div>
    );
}

function CategorySkeleton() {
    return (
        <Card className="border-none shadow-lg">
            <CardHeader>
                <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array(6).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
