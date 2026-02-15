/**
 * @fileoverview Tutorial Overlay Component
 * CREATED: 15-Feb-2026
 * 
 * Renders the tutorial UI with spotlight effect, tooltips, and navigation controls.
 * Highlights target elements and displays step-by-step guidance.
 */

import React, { useEffect, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { CustomButton } from '../ui/CustomButton';
import { useTutorial } from './TutorialContext';
import { cn } from '@/lib/utils';

const TutorialOverlay = memo(() => {
    const {
        activeTutorial,
        currentStep,
        nextStep,
        previousStep,
        skipTutorial,
        completeTutorial,
    } = useTutorial();

    const [targetRect, setTargetRect] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

    // Find and highlight the target element
    const updateTargetPosition = useCallback(() => {
        if (!activeTutorial) return;

        const step = activeTutorial.steps[currentStep];
        if (!step?.target) return;

        const targetElement = document.querySelector(step.target);
        if (!targetElement) {
            console.warn(`Tutorial target not found: ${step.target}`);
            return;
        }

        const rect = targetElement.getBoundingClientRect();
        setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        });

        // Calculate tooltip position based on placement
        const tooltipWidth = 320;
        const tooltipHeight = 200; // Approximate
        const padding = 16;

        let top = 0;
        let left = 0;

        switch (step.placement) {
            case 'top':
                top = rect.top - tooltipHeight - padding;
                left = rect.left + rect.width / 2 - tooltipWidth / 2;
                break;
            case 'bottom':
                top = rect.bottom + padding;
                left = rect.left + rect.width / 2 - tooltipWidth / 2;
                break;
            case 'left':
                top = rect.top + rect.height / 2 - tooltipHeight / 2;
                left = rect.left - tooltipWidth - padding;
                break;
            case 'right':
                top = rect.top + rect.height / 2 - tooltipHeight / 2;
                left = rect.right + padding;
                break;
            default:
                top = rect.bottom + padding;
                left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }

        // Ensure tooltip stays within viewport
        const maxLeft = window.innerWidth - tooltipWidth - padding;
        const maxTop = window.innerHeight - tooltipHeight - padding;
        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));

        setTooltipPosition({ top, left });

        // Scroll target into view if needed
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
        });
    }, [activeTutorial, currentStep]);

    // Update position when tutorial changes or window resizes
    useEffect(() => {
        if (activeTutorial) {
            updateTargetPosition();
            
            const handleResize = () => updateTargetPosition();
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleResize, true);

            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('scroll', handleResize, true);
            };
        }
    }, [activeTutorial, currentStep, updateTargetPosition]);

    if (!activeTutorial) return null;

    const step = activeTutorial.steps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === activeTutorial.steps.length - 1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100]"
            >
                {/* Dark overlay with spotlight cutout */}
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />
                
                {/* Spotlight highlight */}
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="absolute bg-transparent border-4 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
                        style={{
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                        }}
                    />
                )}

                {/* Tutorial tooltip */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-80 max-w-[calc(100vw-2rem)] z-[101]"
                    style={{
                        top: tooltipPosition.top,
                        left: tooltipPosition.left,
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={skipTutorial}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label="Close tutorial"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Content */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
                                {step.title}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {step.content}
                        </p>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center gap-1 mb-4">
                        {activeTutorial.steps.map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-colors",
                                    index <= currentStep
                                        ? "bg-blue-500"
                                        : "bg-gray-200 dark:bg-gray-600"
                                )}
                            />
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {currentStep + 1} of {activeTutorial.steps.length}
                        </div>

                        <div className="flex items-center gap-2">
                            {!isFirstStep && (
                                <CustomButton
                                    variant="outline"
                                    size="sm"
                                    onClick={previousStep}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Back
                                </CustomButton>
                            )}

                            {isLastStep ? (
                                <CustomButton
                                    variant="success"
                                    size="sm"
                                    onClick={completeTutorial}
                                >
                                    <Check className="w-4 h-4 mr-1" />
                                    Complete
                                </CustomButton>
                            ) : (
                                <CustomButton
                                    variant="primary"
                                    size="sm"
                                    onClick={nextStep}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </CustomButton>
                            )}
                        </div>
                    </div>

                    {/* Skip option */}
                    {!isLastStep && (
                        <button
                            onClick={skipTutorial}
                            className="w-full mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            Skip tutorial
                        </button>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

TutorialOverlay.displayName = 'TutorialOverlay';

export default TutorialOverlay;