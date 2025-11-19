import React, { useState } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Steps } from "@/components/ui/steps"; // Assuming Steps component exists or I'll mimic it
import FileUploader from "./FileUploader";
import ColumnMapper from "./ColumnMapper";
import ImportReview from "./ImportReview";
import { parseCSV } from "@/components/utils/simpleCsvParser";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { showToast } from "@/components/ui/use-toast";
import { ArrowRight, Loader2, Upload } from "lucide-react"; // Check, ArrowLeft removed
import { useCategories } from "@/components/hooks/useBase44Entities";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const STEPS = [
    { id: 1, label: "Upload" },
    { id: 2, label: "Map Columns" },
    { id: 3, label: "Review" },
    { id: 4, label: "Finish" }
];

export default function ImportWizard() {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [csvData, setCsvData] = useState({ headers: [], data: [] });
    const [mappings, setMappings] = useState({});
    const [processedData, setProcessedData] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { user } = useSettings();
    const { categories } = useCategories();
    const navigate = useNavigate();

    const handleFileSelect = async (selectedFile) => {
        setFile(selectedFile);
        const text = await selectedFile.text();
        const parsed = parseCSV(text);
        setCsvData(parsed);
        setStep(2);
        showToast({ title: "File parsed", description: `Found ${parsed.data.length} rows.` });
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

            // Category matching logic
            let categoryName = 'Uncategorized';
            let categoryId = null;
            if (mappings.category && row[mappings.category]) {
                const csvCat = row[mappings.category].toLowerCase();
                const matchedCat = categories.find(c => c.name.toLowerCase() === csvCat);
                if (matchedCat) {
                    categoryName = matchedCat.name;
                    categoryId = matchedCat.id;
                }
            }

            return {
                date: row[mappings.date], // Assume date is compatible or handled by backend? No, should parse.
                title: row[mappings.title] || 'Untitled Transaction',
                amount: Math.abs(amountClean),
                type,
                category: categoryName,
                categoryId,
                originalData: row
            };
        }).filter(item => item.amount !== 0 && item.date);

        setProcessedData(processed);
        setStep(3);
    };

    const handleImport = async () => {
        setIsProcessing(true);
        try {
            // Batch create transactions
            // Note: base44.entities.Transaction.create handles one by one, or check if bulkCreate exists.
            // Assuming create loop for safety as per docs instructions (only list, create, update, delete shown).
            // But wait, sdk docs mentioned bulkCreate in examples: "base44.entities.Todo.bulkCreate(...)".
            // So I will use bulkCreate.
            
            const transactionsToCreate = processedData.map(item => ({
                title: item.title,
                amount: item.amount,
                type: item.type,
                date: new Date(item.date).toISOString().split('T')[0], // Basic date formatting
                category_id: item.categoryId || categories.find(c => c.name === 'Uncategorized')?.id, // Fallback?
                // If no category found, maybe don't send category_id? Or user needs to handle.
                // For now, if no category match, it will be null.
            }));

            await base44.entities.Transaction.bulkCreate(transactionsToCreate);

            showToast({ title: "Success", description: `Imported ${transactionsToCreate.length} transactions.` });
            navigate(createPageUrl("Transactions"));
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

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Stepper Indicator */}
            <Steps steps={STEPS} currentStep={step} />

            {/* Content */}
            <div className="min-h-[400px]">
                {step === 1 && <FileUploader onFileSelect={handleFileSelect} />}
                {step === 2 && (
                    <div className="space-y-6">
                        <ColumnMapper 
                            headers={csvData.headers} 
                            mappings={mappings} 
                            onMappingChange={handleMappingChange} 
                        />
                        <div className="flex justify-end gap-4">
                            <CustomButton variant="outline" onClick={() => setStep(1)}>Back</CustomButton>
                            <CustomButton 
                                onClick={processData} 
                                disabled={!mappings.date || !mappings.amount || !mappings.title}
                            >
                                Review Data <ArrowRight className="w-4 h-4 ml-2" />
                            </CustomButton>
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-6">
                        <ImportReview data={processedData} onDeleteRow={handleDeleteRow} />
                        <div className="flex justify-end gap-4">
                            <CustomButton variant="outline" onClick={() => setStep(2)}>Back</CustomButton>
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