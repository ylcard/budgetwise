import { useState } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Steps } from "@/components/ui/steps";
import FileUploader from "./FileUploader";
import ColumnMapper from "./ColumnMapper";
import CategorizeReview from "./CategorizeReview";
import { parseCSV } from "@/components/utils/simpleCsvParser";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { showToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Upload } from "lucide-react";
import { useCategories, useCategoryRules, useAllBudgets, useGoals, useTransactions } from "@/components/hooks/useBase44Entities";
import { QUERY_KEYS } from "../hooks/queryKeys";
import { categorizeTransaction } from "@/components/utils/transactionCategorization";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { formatDateString } from "../utils/dateUtils";
import { getOrCreateSystemBudgetForTransaction } from "../utils/budgetInitialization";

const STEPS = [
    { id: 1, label: "Upload" },
    { id: 2, label: "Review" },
    { id: 3, label: "Finish" }
];

export default function ImportWizard({ onSuccess }) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [csvData, setCsvData] = useState({ headers: [], data: [] });
    const [showColumnMapper, setShowColumnMapper] = useState(false);
    const [mappings, setMappings] = useState({});
    const [processedData, setProcessedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const { user, settings } = useSettings();
    const { categories, isLoading: categoriesLoading } = useCategories();
    const { rules } = useCategoryRules(user);
    const { goals, isLoading: goalsLoading } = useGoals(user);
    const { allBudgets } = useAllBudgets(user);
    const { transactions: existingTransactions } = useTransactions(user);
    const navigate = useNavigate();
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

    // Helper to clean strings into numbers while preserving the sign for detection
    const parseAmountWithSign = (value) => {
        if (!value && value !== 0) return 0;
        const str = value.toString();
        // Keep digits, dots, and the minus sign
        const cleanStr = str.replace(/[^0-9.-]/g, "");
        return parseFloat(cleanStr) || 0;
    };

    const handleFileSelect = async (selectedFile) => {
        setFile(selectedFile);
        setError(null); // Clear previous errors on new file select

        if (selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.type === 'application/pdf') {
            await handlePdfProcessing(selectedFile);
        } else {
            const text = await selectedFile.text();
            const parsed = parseCSV(text);
            setCsvData(parsed);
            setShowColumnMapper(true);
            showToast({ title: "File parsed", description: `Found ${parsed.data.length} rows.` });
        }
    };

    const handlePdfProcessing = async (file) => {
        setIsLoadingPdf(true);
        setError(null);
        try {
            showToast({ title: "Uploading...", description: "Uploading file for analysis." });

            // 1. Upload File
            const { file_url } = await base44.integrations.Core.UploadFile({ file: file });

            showToast({ title: "Analyzing...", description: "Extracting data from PDF. This may take a moment." });

            // 2. Extract Data (Strict Schema)
            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url: file_url,
                json_schema: {
                    "type": "object",
                    "properties": {
                        "transactions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "date": { "type": "string", "description": "The 'Transaction Date'. Format strictly YYYY-MM-DD." },
                                    "valueDate": { "type": "string", "description": "The 'Value Date' or 'Posting Date'. Format strictly YYYY-MM-DD." },
                                    "reason": { "type": "string", "description": "The raw merchant text or description. If split across multiple lines, combine them." },
                                    "amount": { "type": "number", "description": "Numeric value. CRITICAL: If 'Debit'/'Credit' columns exist, 'Debit' is negative (-), 'Credit' is positive (+). If 'CR'/'DR' markers exist, use them." }
                                },
                                "required": ["date", "reason", "amount"]
                            }
                        }
                    },
                    "required": ["transactions"]
                }
            });

            if (result.status === 'error') throw new Error(result.details);
            const extractedData = result.output?.transactions || [];

            // Helper for Duplicate Detection
            const findSurvivor = (newItem) => {
                if (!existingTransactions) return null;
                return existingTransactions.find(ex =>
                    Math.abs(ex.amount) === Math.abs(newItem.amount) &&
                    ex.date === newItem.date
                );
            };

            // Helper: Local "Memory"
            const findLearnedData = (rawReason) => {
                if (!existingTransactions || !rawReason) return null;
                const match = existingTransactions.find(t =>
                    t.title && rawReason.toUpperCase().includes(t.title.toUpperCase()) && t.category_id
                );
                if (match) return {
                    title: match.title,
                    categoryName: categories.find(c => c.id === match.category_id)?.name || 'Uncategorized',
                    categoryId: match.category_id,
                    priority: match.financial_priority
                };
            };

            // 1. Pre-process for AI Engine (Clean Structure)
            const preProcessed = extractedData.map(item => {
                const rawVal = parseAmountWithSign(item.amount);
                const magnitude = Math.abs(rawVal);
                let txDate = item.date;
                let pdDate = item.valueDate;
                if (txDate && pdDate) {
                    const d1 = new Date(txDate);
                    const d2 = new Date(pdDate);
                    if (!isNaN(d1) && !isNaN(d2) && d1 > d2) {
                        txDate = item.valueDate;
                        pdDate = item.date;
                    }
                }
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    date: txDate,
                    title: item.reason || 'Untitled', // Temp title
                    rawDescription: item.reason || '', // Permanent Raw
                    amount: magnitude, // STORED AS 'amount' now to avoid scope errors
                    type: rawVal < 0 ? 'expense' : 'income',
                    paidDate: pdDate,
                    originalData: item
                };
            }).filter(item => item.amount !== 0 && item.date);

            // 2. Call Backend Engine (Waterfall Mode)
            showToast({ title: "Categorizing...", description: "AI is cleaning and organizing..." });

            const engineResponse = await base44.functions.invoke('CategorizationEngine', {
                transactions: preProcessed,
                rules: rules,
                categories: categories
            });

            // Safety Unwrap (Fixes "map is not a function")
            const aiResults = Array.isArray(engineResponse) ? engineResponse
                : Array.isArray(engineResponse?.data) ? engineResponse.data
                    : preProcessed;

            // 3. Final Merge
            const processed = aiResults.map(item => {
                // Check Memory First
                const learned = findLearnedData(item.title);

                // Resolve Priority: Memory > DB Category Default > 'wants'
                let finalPriority = 'wants';
                if (learned) {
                    finalPriority = learned.priority;
                } else if (item.categoryName) {
                    const dbCat = categories.find(c => c.name.toLowerCase() === item.categoryName.toLowerCase());
                    if (dbCat && dbCat.priority) finalPriority = dbCat.priority;
                }
                const survivor = findSurvivor({ amount: item.amount, date: item.date });

                // AI returns 'cleanTitle' or 'cleanName' usually
                const aiCleaned = item.cleanTitle || item.cleanName || item.title;

                return {
                    ...item,
                    // Memory overrides AI, AI overrides Raw
                    category: learned ? learned.categoryName : (item.categoryName || 'Uncategorized'),
                    categoryId: learned ? learned.categoryId : (item.category_id || null),
                    title: learned ? learned.title : aiCleaned, // Dynamic Display Name
                    cleanDescription: aiCleaned, // Permanent AI Record
                    financial_priority: finalPriority,
                    confidence: item.confidence, // Pass through for UI badges
                    amount: item.amount,
                    originalAmount: item.amount,
                    originalCurrency: settings?.baseCurrency || 'USD',
                    isPaid: !!item.paidDate,
                    budgetId: null,
                    isDuplicate: !!survivor,
                    duplicateMatch: survivor
                };
            });

            setProcessedData(processed);
            setStep(2);
            showToast({ title: "Success", description: `Extracted ${processed.length} transactions.` });
        } catch (error) {
            console.error('PDF Processing Error:', error);
            setError(`PDF Processing Failed: ${error.message || "Unknown error"}`);
            setFile(null);
        } finally {
            setIsLoadingPdf(false);
        }
    };

    const handleMappingChange = (field, column) => {
        setMappings(prev => ({ ...prev, [field]: column }));
    };

    const processData = () => {
        // Helper for Duplicate Detection
        const findSurvivor = (newItem) => {
            if (!existingTransactions) return null;
            return existingTransactions.find(ex =>
                Math.abs(ex.amount) === Math.abs(newItem.amount) &&
                ex.date === newItem.date
            );
        };

        const processed = csvData.data.map(row => {
            const rawVal = parseAmountWithSign(row[mappings.amount]);
            const magnitude = Math.abs(rawVal);

            let type = 'expense';
            if (mappings.type && row[mappings.type]) {
                type = row[mappings.type].toLowerCase().includes('income') ? 'income' : 'expense';
            } else {
                type = rawVal < 0 ? 'expense' : 'income';
            }

            // Enhanced categorization
            // First check if CSV has an explicit category column
            let catResult = { categoryId: null, categoryName: 'Uncategorized', priority: 'wants' };

            if (mappings.category && row[mappings.category]) {
                const csvCat = row[mappings.category];
                const matchedCat = categories.find(c => c.name.toLowerCase() === csvCat.toLowerCase());
                if (matchedCat) {
                    catResult = { categoryId: matchedCat.id, categoryName: matchedCat.name, priority: matchedCat.priority || 'wants' };
                }
            }

            // If no explicit mapping or not found, run auto-categorization
            if (!catResult.categoryId) {
                catResult = categorizeTransaction(
                    { title: row[mappings.title] },
                    rules,
                    categories
                );
            }

            const survivor = findSurvivor({ amount: magnitude, date: row[mappings.date] });

            return {
                date: row[mappings.date],
                title: row[mappings.title] || 'Untitled Transaction',
                rawDescription: row[mappings.title] || '', // CSV usually only has one desc field
                cleanDescription: row[mappings.title] || '', // Default to raw if no AI run yet
                amount: magnitude,
                originalAmount: magnitude,
                originalCurrency: settings?.baseCurrency || 'USD',
                type,
                category: catResult.categoryName || 'Uncategorized',
                categoryId: catResult.categoryId || null,
                financial_priority: catResult.priority || 'wants',
                isPaid: true, // Assume bank import data is already paid/settled
                paidDate: row[mappings.date],
                budgetId: null,
                originalData: row,
                isDuplicate: !!survivor,
                duplicateMatch: survivor
            };
        }).filter(item => item.amount !== 0 && item.date);

        setProcessedData(processed);
        setStep(2);
    };

    const handleImport = async () => {
        setIsProcessing(true);
        try {
            // Pre-flight data check
            if (goalsLoading || !goals.length) {
                showToast({ title: "System warming up", description: "Still loading your goals. Please try again in a second." });
                setIsProcessing(false);
                return;
            }

            // --- AUTO-CREATE MISSING CATEGORIES ---
            const newCategories = new Set();
            processedData.forEach(item => {
                if (item.type === 'expense' && !item.categoryId && item.category && item.category !== 'Uncategorized') {
                    if (!categories.some(c => c.name.toLowerCase() === item.category.toLowerCase())) {
                        newCategories.add(item.category);
                    }
                }
            });

            if (newCategories.size > 0) {
                showToast({ title: "Initializing", description: `Creating ${newCategories.size} new categories...` });
                await Promise.all(Array.from(newCategories).map(name =>
                    base44.entities.Category.create({ name, type: 'expense', icon: 'Circle', color: '#94a3b8' })
                ));
                await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
            }
            const freshCategories = await base44.entities.Category.list();

            // 1. PRE-FLIGHT: Identify all unique Month+Priority combinations
            const expenseItems = processedData.filter(item => item.type === 'expense');
            const uniqueSyncKeys = new Set();

            expenseItems.forEach(item => {
                const date = formatDateString(item.paidDate || item.date);
                const priority = item.financial_priority || 'wants';
                uniqueSyncKeys.add(`${date}|${priority}`);
            });

            // 2. BATCH ENSURE: Create/Get all necessary budgets in parallel
            const budgetMap = {};
            const syncPromises = Array.from(uniqueSyncKeys).map(async (key) => {
                const [date, priority] = key.split('|');
                // Initializing with $0 is fine; the engine handles existing budgets
                const id = await getOrCreateSystemBudgetForTransaction(user.email, date, priority, goals, settings);
                budgetMap[key] = id;
            });
            await Promise.all(syncPromises);

            // 3. MAP TRANSACTIONS: Build final objects with verified IDs
            const transactionsToCreate = processedData.map(item => {
                const isExpense = item.type === 'expense';
                const date = formatDateString(item.date);
                const paidDate = item.paidDate ? formatDateString(item.paidDate) : null;
                const syncKey = `${paidDate || date}|${item.financial_priority || 'wants'}`;

                // Resolve Category ID (checking fresh list)
                let finalCatId = item.categoryId;
                if (item.type === 'expense' && !finalCatId) {
                    const match = freshCategories.find(c => c.name.toLowerCase() === (item.category || '').toLowerCase());
                    finalCatId = match ? match.id : freshCategories.find(c => c.name.includes('Uncategorized'))?.id;
                }

                return {
                    title: item.title,
                    amount: Math.abs(item.amount),
                    rawDescription: item.rawDescription,
                    cleanDescription: item.cleanDescription,
                    type: item.type,
                    date,
                    category_id: finalCatId,
                    financial_priority: isExpense ? (item.financial_priority || 'wants') : null,
                    budgetId: isExpense ? (item.budgetId || budgetMap[syncKey]) : null,
                    originalAmount: Math.abs(item.amount),
                    originalCurrency: item.originalCurrency,
                    isPaid: isExpense ? true : null,
                    paidDate
                };
            });

            await base44.entities.Transaction.bulkCreate(transactionsToCreate);

            // Force a hard refresh of the cache to ensure $0 budgets recalculate
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS] });

            const uniqueMonths = new Set(processedData.map(d => {
                const date = new Date(d.date);
                return date.toLocaleString('default', { month: 'long' });
            }));

            showToast({
                title: "Import Complete",
                description: `Successfully added ${transactionsToCreate.length} transactions across ${uniqueMonths.size} month(s).`
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(createPageUrl("Dashboard"));
            }
        } catch (error) {
            console.error("IMPORT ERROR:", error);
            showToast({
                title: "Import Failed",
                description: error.message || "An unexpected error occurred during import.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteRows = (indicesToDelete) => {
        // Convert array to Set for O(1) lookup
        const indicesSet = new Set(indicesToDelete);
        setProcessedData(prev => prev.filter((_, i) => !indicesSet.has(i)));
    };

    const handleUpdateRow = (index, updates) => {
        setProcessedData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], ...updates };
            return newData;
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Stepper Indicator */}
            <Steps steps={STEPS} currentStep={step} />

            {/* Content */}
            <div className="min-h-[400px]">
                {/* Permanent error display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                            <div className="mt-0.5 text-red-600 font-bold">!</div>
                            <div className="text-sm text-red-800 font-medium whitespace-pre-wrap break-words w-full">
                                {error}
                            </div>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label="Dismiss error"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {step === 1 && (
                    isLoadingPdf ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900">Processing PDF</h3>
                                <p className="text-sm text-gray-500">Extracting transaction data...</p>
                            </div>
                        </div>
                    ) : showColumnMapper ? (
                        // If CSV uploaded, show Mapper (still Step 1 visually)
                        <div className="space-y-6">

                            <ColumnMapper
                                headers={csvData.headers}
                                mappings={mappings}
                                onMappingChange={handleMappingChange}
                            />
                            <div className="flex justify-end gap-4">
                                <CustomButton variant="outline" onClick={() => {
                                    setShowColumnMapper(false);
                                    setFile(null);
                                }}>Back</CustomButton>
                                <CustomButton
                                    onClick={processData}
                                    disabled={!mappings.date || !mappings.amount || !mappings.title}
                                >
                                    Review Data <ArrowRight className="w-4 h-4 ml-2" />
                                </CustomButton>
                            </div>
                        </div>
                    ) : (
                        // Default Step 1 state: Upload
                        <FileUploader onFileSelect={handleFileSelect} />
                    )
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <CategorizeReview
                            data={processedData}
                            categories={categories}
                            allBudgets={allBudgets}
                            onUpdateRow={handleUpdateRow}
                            onDeleteRows={handleDeleteRows}
                        />
                        <div className="flex justify-end gap-4">
                            <CustomButton variant="outline" onClick={() => {
                                setStep(1);
                                // If we have CSV data, go back to mapper, otherwise file uploader
                                if (csvData.data.length > 0) setShowColumnMapper(true);
                            }}>Back</CustomButton>
                            <CustomButton
                                variant="primary"
                                onClick={handleImport}
                                disabled={isProcessing || categoriesLoading || goalsLoading}
                            >
                                {isProcessing || categoriesLoading || goalsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Import {processedData.length} Transactions
                            </CustomButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ImportWizardDialog({
    triggerVariant = "default",
    triggerSize = "default",
    triggerClassName = "",
    renderTrigger = true,
    open,
    onOpenChange
}) {

    // Support controlled or uncontrolled state
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = open !== undefined;
    const finalOpen = isControlled ? open : internalOpen;
    const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen;

    return (
        <Dialog open={finalOpen} onOpenChange={finalOnOpenChange}>
            {renderTrigger && (
                <DialogTrigger asChild>
                    <CustomButton
                        variant={triggerVariant}
                        size={triggerSize}
                        className={triggerClassName}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import Data
                    </CustomButton>
                </DialogTrigger>
            )}

            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Data</DialogTitle>
                    <DialogDescription>Upload and import transactions from CSV files</DialogDescription>
                </DialogHeader>
                <ImportWizard onSuccess={() => finalOnOpenChange(false)} />
            </DialogContent>
        </Dialog>
    );
}
