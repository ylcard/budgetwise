/**
 * Budget Creation Wizard
 * CREATED: 16-Jan-2026
 * 
 * Multi-step wizard for creating custom budgets with AI assistance:
 * Step 1: Select archetype or skip
 * Step 2: Customize budget details with feasibility analysis
 */

import { useState, useEffect, useMemo } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { ArrowLeft } from "lucide-react";
import BudgetArchetypeSelector from "./BudgetArchetypeSelector";
import CustomBudgetForm from "./CustomBudgetForm";
import BudgetFeasibilityDisplay from "./BudgetFeasibilityDisplay";
import {
    analyzeEventPatterns,
    generateBudgetArchetypes
} from "../utils/historicalAnalyzer";
import { checkBudgetImpact } from "../utils/budgetFeasibilityEngine";
import { parseISO } from "date-fns";

export default function BudgetCreationWizard({
    transactions,
    categories,
    settings,
    onSubmit,
    onCancel,
    isSubmitting
}) {
    const [step, setStep] = useState('archetype'); // 'archetype' | 'form'
    const [selectedArchetype, setSelectedArchetype] = useState(null);
    const [formData, setFormData] = useState(null);
    const [feasibility, setFeasibility] = useState(null);

    // Analyze patterns and generate archetypes
    const archetypes = useMemo(() => {
        if (!transactions || !categories) return [];

        const events = analyzeEventPatterns(transactions, categories);
        return generateBudgetArchetypes(events);
    }, [transactions, categories]);

    const handleSelectArchetype = (archetype) => {
        // Pre-fill form data based on archetype
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + archetype.typicalDuration);

        const initialFormData = {
            name: archetype.name,
            allocatedAmount: archetype.recommendedAmount.toString(),
            startDate: today.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            description: `Based on your typical ${archetype.name.toLowerCase()} spending`,
            color: '#3B82F6'
        };

        setSelectedArchetype(archetype);
        setFormData(initialFormData);
        setStep('form');
    };

    const handleSkipArchetype = () => {
        setSelectedArchetype(null);
        setFormData(null);
        setStep('form');
    };

    const handleBackToArchetypes = () => {
        setStep('archetype');
        setSelectedArchetype(null);
        setFormData(null);
        setFeasibility(null);
    };

    // Real-time feasibility calculation as form changes
    const handleFormChange = (updatedData) => {
        setFormData(updatedData);

        // Calculate feasibility immediately on change
        if (updatedData.allocatedAmount && updatedData.startDate && updatedData.endDate) {
            const amount = parseFloat(updatedData.allocatedAmount);
            if (!isNaN(amount) && amount > 0) {
                const analysis = checkBudgetImpact(
                    amount,
                    parseISO(updatedData.startDate),
                    parseISO(updatedData.endDate),
                    transactions,
                    settings
                );
                setFeasibility(analysis);
            }
        }
    };

    const handleFormSubmit = (data) => {
        onSubmit(data);
    };

    if (step === 'archetype') {
        return (
            <div>
                <BudgetArchetypeSelector
                    archetypes={archetypes}
                    onSelectArchetype={handleSelectArchetype}
                    onSkip={handleSkipArchetype}
                    settings={settings}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Back button if came from archetype */}
            {archetypes.length > 0 && (
                <CustomButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToArchetypes}
                    className="mx-4 md:mx-0 mb-2 shrink-0 self-start"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Templates
                </CustomButton>
            )}

            <CustomBudgetForm
                budget={formData}
                onSubmit={handleFormSubmit}
                onCancel={onCancel}
                isSubmitting={isSubmitting}
                onFormChange={handleFormChange}
            >
                <div className="mt-6 lg:mt-0 pb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Financial Impact</h4>
                    {feasibility ? (
                        <BudgetFeasibilityDisplay
                            feasibility={feasibility}
                            settings={settings}
                            budgetData={formData}
                        />
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                            <p className="text-sm text-gray-500">
                                Enter budget details to see feasibility analysis
                            </p>
                        </div>
                    )}
                </div>
            </CustomBudgetForm>
        </div>
    );
}