import React, { useState } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Steps } from "@/components/ui/steps"; // Assuming Steps component exists or I'll mimic it
import FileUploader from "./FileUploader";
import ColumnMapper from "./ColumnMapper";
import CategorizeReview from "./CategorizeReview";
import { parseCSV } from "@/components/utils/simpleCsvParser";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { showToast } from "@/components/ui/use-toast";
import { ArrowRight, Loader2, Upload } from "lucide-react";
import { useCategories, useCategoryRules } from "@/components/hooks/useBase44Entities";
import { categorizeTransaction } from "@/components/utils/transactionCategorization";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const STEPS = [
    { id: 1, label: "Upload" },
    { id: 2, label: "Review" },
    { id: 3, label: "Finish" }
];

export default function ImportWizard({ onSuccess }) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [csvData, setCsvData] = useState({ headers: [], data: [] });
    const [showColumnMapper, setShowColumnMapper] = useState(false);
    const [mappings, setMappings] = useState({});
    const [processedData, setProcessedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null); // CREATED 19-Nov-2025: Error state for permanent display
    const { user, settings } = useSettings();
    const { categories } = useCategories();
    const { rules } = useCategoryRules(user);
    const navigate = useNavigate();
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

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
            const { file_url } = await base44.integrations.Core.UploadFile({ file: file });

            showToast({ title: "Analyzing...", description: "Extracting data from PDF. This may take a moment." });
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
                                    "date": { "type": "string", "description": "Transaction date (YYYY-MM-DD)" },
                                    "valueDate": { "type": "string", "description": "Payment/Value date (YYYY-MM-DD)" },
                                    "reason": { "type": "string", "description": "Merchant or description" },
                                    "amount": { "type": "number", "description": "Transaction amount. Negative for expenses, positive for income." }
                                },
                                "required": ["date", "reason", "amount"]
                            }
                        }
                    },
                    "required": ["transactions"]
                }
            });

            if (result.status === 'error') throw new Error(result.details);

            // Updated 19-Nov-2025: Handle new schema structure with root object
            const extractedData = result.output?.transactions || [];

            const processed = extractedData.map(item => {
                const amountClean = parseFloat(item.amount);
                const type = amountClean >= 0 ? 'income' : 'expense';

                // Enhanced categorization using rules and patterns
                const catResult = categorizeTransaction(
                    { title: item.reason },
                    rules,
                    categories
                );

                return {
                    date: item.date,
                    title: item.reason || 'Untitled Transaction',
                    amount: Math.abs(amountClean),
                    originalAmount: amountClean,
                    originalCurrency: settings?.baseCurrency || 'USD',
                    type,
                    category: catResult.categoryName || 'Uncategorized',
                    categoryId: catResult.categoryId || null,
                    financial_priority: catResult.priority || 'wants',
                    isPaid: !!item.valueDate,
                    paidDate: item.valueDate || null,
                    originalData: item
                };
            }).filter(item => item.amount !== 0 && item.date);

            setProcessedData(processed);
            setStep(2);
            showToast({ title: "Success", description: `Extracted ${processed.length} transactions from PDF.` });
        } catch (error) {
            console.error('PDF Processing Error:', error);
            // CREATED 19-Nov-2025: Set permanent error state instead of relying solely on toast
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
        const processed = csvData.data.map(row => {
            const amountRaw = row[mappings.amount];
            // Basic cleaning of amount (remove currency symbols, commas)
            const amountClean = amountRaw ? parseFloat(amountRaw.replace(/[^0-9.-]+/g, "")) : 0;

            let type = 'expense';
            if (mappings.type && row[mappings.type]) {
                type = row[mappings.type].toLowerCase().includes('income') ? 'income' : 'expense';
            } else {
                type = amountClean >= 0 ? 'income' : 'expense';
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

            return {
                date: row[mappings.date],
                title: row[mappings.title] || 'Untitled Transaction',
                amount: Math.abs(amountClean),
                originalAmount: amountClean,
                originalCurrency: settings?.baseCurrency || 'USD',
                type,
                category: catResult.categoryName || 'Uncategorized',
                categoryId: catResult.categoryId || null,
                financial_priority: catResult.priority || 'wants',
                isPaid: false, // CSV usually doesn't imply paid status unless specified, default false
                paidDate: null,
                originalData: row
            };
        }).filter(item => item.amount !== 0 && item.date);

        setProcessedData(processed);
        setStep(2);
    };

    const handleImport = async () => {
        setIsProcessing(true);
        try {
            const transactionsToCreate = processedData.map(item => {
                const isExpense = item.type === 'expense';
                return {
                    title: item.title,
                    amount: item.amount,
                    type: item.type,
                    date: new Date(item.date).toISOString().split('T')[0],
                    category_id: isExpense ? (item.categoryId || categories.find(c => c.name === 'Uncategorized')?.id) : null,
                    financial_priority: isExpense ? item.financial_priority : null,
                    originalAmount: item.originalAmount,
                    originalCurrency: item.originalCurrency,
                    isPaid: isExpense ? (item.isPaid || false) : null,
                    paidDate: (isExpense && item.paidDate) ? new Date(item.paidDate).toISOString().split('T')[0] : null
                };
            });

            await base44.entities.Transaction.bulkCreate(transactionsToCreate);

            showToast({ title: "Success", description: `Imported ${transactionsToCreate.length} transactions.` });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(createPageUrl("Dashboard"));
            }
        } catch (error) {
            console.error(error);
            showToast({ title: "Error", description: "Failed to import transactions.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteRow = (index) => {
        setProcessedData(prev => prev.filter((_, i) => i !== index));
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
                {/* CREATED 19-Nov-2025: Permanent error display */}
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
                            onUpdateRow={handleUpdateRow}
                            onDeleteRow={handleDeleteRow}
                        />
                        <div className="flex justify-end gap-4">
                            <CustomButton variant="outline" onClick={() => {
                                setStep(1);
                                // If we have CSV data, go back to mapper, otherwise file uploader
                                if (csvData.data.length > 0) setShowColumnMapper(true);
                            }}>Back</CustomButton>
                            <CustomButton variant="primary" onClick={handleImport} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
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
    renderTrigger = true
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                <ImportWizard onSuccess={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
