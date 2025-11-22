import { useRef, useState } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function FileUploader({ onFileSelect }) {
    const inputRef = useRef(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = (file) => {
        setError(null);
        const isCsv = file && (file.type === "text/csv" || file.name.endsWith('.csv'));
        const isPdf = file && (file.type === "application/pdf" || file.name.endsWith('.pdf'));

        if (isCsv || isPdf) {
            onFileSelect(file);
        } else {
            setError("Please upload a valid CSV or PDF file.");
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.pdf"
                    className="hidden"
                    onChange={handleChange}
                />
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Upload CSV File</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Drag and drop your file here, or click to browse
                        </p>
                    </div>
                    <CustomButton onClick={() => inputRef.current?.click()} variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Select File
                    </CustomButton>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="bg-gray-50 border-none">
                <CardContent className="pt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Format Requirements:</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h5 className="text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wider">CSV</h5>
                            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                                <li>First row must contain headers</li>
                                <li>Required: Date, Amount, Description</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wider">PDF</h5>
                            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                                <li>Bank statements or transaction lists</li>
                                <li>Must contain legible transaction data</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
