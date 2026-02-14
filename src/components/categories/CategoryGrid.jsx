import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryCard from "./CategoryCard";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Box, Lock } from "lucide-react";
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

    if (isLoading) {
        return <CategorySkeleton />;
    }

    const currentCategories = activeTab === 'custom' ? customCategories : systemCategories;

    return (
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
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                        >
                            {customCategories.length > 0 ? (
                                customCategories.map((category) => (
                                    <CategoryCard
                                        key={category.id}
                                        ref={(node) => setCardRef(category.id, node)}
                                        category={category}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIds?.has(category.id)}
                                        onToggle={() => onToggleSelection(category.id, !selectedIds?.has(category.id))}
                                        isAdmin={isAdmin}
                                    />
                                ))
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
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                        >
                            {systemCategories.map((category) => (
                                <CategoryCard
                                    key={category.id}
                                    ref={(node) => setCardRef(category.id, node)}
                                    category={category}
                                    onEdit={isAdmin ? onEdit : undefined}
                                    onDelete={undefined} // System categories generally cannot be deleted
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedIds?.has(category.id)}
                                    onToggle={() => onToggleSelection(category.id, !selectedIds?.has(category.id))}
                                    isAdmin={isAdmin}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
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
