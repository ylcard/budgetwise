import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryCard from "./CategoryCard";
import { FINANCIAL_PRIORITIES } from "../utils/constants";

export default function CategoryGrid({ categories, onEdit, onDelete, isLoading, isSelectionMode, selectedIds, onToggleSelection, onSelectionChange, isAdmin }) {
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
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Your Categories</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {Array(6).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (categories.length === 0) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Your Categories</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        <p>No categories yet. Create your first one!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Sort logic: Priority Order (Needs -> Wants -> Savings) then Alphabetical
    const sortedCategories = [...categories].sort((a, b) => {
        const orderA = FINANCIAL_PRIORITIES[a.priority]?.order ?? 99;
        const orderB = FINANCIAL_PRIORITIES[b.priority]?.order ?? 99;

        // If priorities differ, sort by priority weight
        if (orderA !== orderB) return orderA - orderB;
        // If priorities are same, sort by name
        return a.name.localeCompare(b.name);
    });

    return (
        <Card className="border-none shadow-lg relative select-none" ref={containerRef} onMouseDown={handleMouseDown}>
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
            {/* UPDATED 14-Feb-2026: Show count of system vs custom categories */}
            <CardHeader>
                <CardTitle>
                    All Categories ({sortedCategories.length})
                    <span className="text-sm font-normal text-gray-500 ml-2">
                        {categories.filter(c => c.isSystemCategory).length} System,{' '}
                        {categories.filter(c => !c.isSystemCategory).length} Custom
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedCategories.map((category) => (
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
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}