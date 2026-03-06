/**
 * Budget Creation Wizard
 * CREATED: 16-Jan-2026
 * 
 * Multi-step wizard for creating custom budgets with AI assistance:
 * Step 1: Select archetype or skip
 * Step 2: Customize budget details with feasibility analysis
 */

import { useState, useMemo } from "react";
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
import {
  parseDate,
  formatDateString,
  addDays,
  normalizeToMidnight
} from "../utils/dateUtils";

/**
 * BudgetCreationWizard Component
 * A multi-step flow for creating custom budgets, leveraging historical data 
 * to suggest archetypes and real-time feasibility analysis for financial impact.
 * @param {Object} props
 * @param {Array} props.transactions - Raw transaction history for analysis.
 * @param {Array} props.categories - Category metadata.
 * @param {Object} props.settings - Global app settings (currency, dates).
 * @param {Function} props.onSubmit - Callback for final budget creation.
 * @param {Function} props.onCancel - Callback to exit the wizard.
 * @param {boolean} props.isSubmitting - Loading state for the submit action.
 */
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

  /** @type {Array} Generated archetypes based on spending history */
  const archetypes = useMemo(() => {
    if (!transactions || !categories) return [];

    const events = analyzeEventPatterns(transactions, categories);
    return generateBudgetArchetypes(events);
  }, [transactions, categories]);

  /**
   * Transition to form step pre-filled with archetype data.
   * @param {Object} archetype - The selected template archetype.
   */
  const handleSelectArchetype = (archetype) => {
    // Ensure dates are consistent local midnight to avoid 1-day cutoff bugs
    const today = normalizeToMidnight(new Date());
    const endDate = addDays(today, archetype.typicalDuration);

    const initialFormData = {
      name: archetype.name,
      allocatedAmount: archetype.recommendedAmount.toString(),
      startDate: formatDateString(today),
      endDate: formatDateString(endDate),
      description: `Based on your typical ${archetype.name.toLowerCase()} spending`,
      color: '#3B82F6'
    };

    setSelectedArchetype(archetype);
    setFormData(initialFormData);
    setStep('form');
  };

  /**
   * Transition to form step with empty data.
   */
  const handleSkipArchetype = () => {
    setSelectedArchetype(null);
    setFormData(null);
    setStep('form');
  };

  /**
   * Reset wizard state to the selection step.
   */
  const handleBackToArchetypes = () => {
    setStep('archetype');
    setSelectedArchetype(null);
    setFormData(null);
    setFeasibility(null);
  };

  /**
   * Updates local form state and triggers real-time feasibility analysis.
   * @param {Object} updatedData - Current state of the budget form.
   */
  const handleFormChange = (updatedData) => {
    setFormData(updatedData);

    // Calculate feasibility immediately on change
    if (updatedData.allocatedAmount && updatedData.startDate && updatedData.endDate) {
      const amount = parseFloat(updatedData.allocatedAmount);
      if (!isNaN(amount) && amount > 0) {
        const analysis = checkBudgetImpact(
          amount,
          parseDate(updatedData.startDate),
          parseDate(updatedData.endDate),
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
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
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