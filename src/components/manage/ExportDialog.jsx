/**
 * CREATED 14-Feb-2026: Enhanced export dialog with date ranges, formats, and PDF templates
 */

import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ExportDialog({ 
    open, 
    onOpenChange, 
    exportSelections, 
    setExportSelections,
    dateRange,
    setDateRange,
    fileFormat,
    setFileFormat,
    pdfTemplate,
    setPdfTemplate,
    onExport,
    isExporting
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>Export Your Data</AlertDialogTitle>
                    <AlertDialogDescription>
                        Configure your export settings and download your financial data.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Tabs defaultValue="data" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="data">Data Selection</TabsTrigger>
                        <TabsTrigger value="range">Date Range</TabsTrigger>
                        <TabsTrigger value="format">Format & Layout</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Data Selection */}
                    <TabsContent value="data" className="space-y-4 mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                            Select which data types to include in your export.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries({
                                transactions: "Transactions",
                                categories: "Categories",
                                budgetGoals: "Budget Goals",
                                systemBudgets: "System Budgets",
                                customBudgets: "Custom Budgets",
                                budgetAllocations: "Budget Allocations",
                                exchangeRates: "Exchange Rates",
                                cashWallet: "Cash Wallet",
                                categoryRules: "Category Rules",
                                recurringTransactions: "Recurring Transactions",
                                settings: "Settings",
                                bankConnections: "Bank Connections (Sensitive)"
                            }).map(([key, label]) => (
                                <div key={key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={key}
                                        checked={exportSelections[key]}
                                        onCheckedChange={(checked) =>
                                            setExportSelections(prev => ({ ...prev, [key]: checked }))
                                        }
                                    />
                                    <Label htmlFor={key} className="cursor-pointer text-sm font-normal">
                                        {label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Tab 2: Date Range */}
                    <TabsContent value="range" className="space-y-4 mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                            Filter time-based data (transactions, budgets) by date range. Leave empty to export all data.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <Checkbox
                                    id="useDateFilter"
                                    checked={dateRange.enabled}
                                    onCheckedChange={(checked) =>
                                        setDateRange(prev => ({ ...prev, enabled: checked }))
                                    }
                                />
                                <Label htmlFor="useDateFilter" className="cursor-pointer text-sm font-medium">
                                    Apply date range filter
                                </Label>
                            </div>

                            {dateRange.enabled && (
                                <div className="space-y-2">
                                    <Label>Select Date Range</Label>
                                    <DateRangePicker
                                        value={{
                                            from: dateRange.from ? new Date(dateRange.from) : undefined,
                                            to: dateRange.to ? new Date(dateRange.to) : undefined
                                        }}
                                        onChange={(range) => {
                                            setDateRange({
                                                enabled: true,
                                                from: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
                                                to: range?.to ? format(range.to, 'yyyy-MM-dd') : null
                                            });
                                        }}
                                    />
                                    <p className="text-xs text-gray-500">
                                        This filter applies to: Transactions, System Budgets, Custom Budgets
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Tab 3: Format & Layout */}
                    <TabsContent value="format" className="space-y-6 mt-4">
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Export Format</Label>
                            <RadioGroup value={fileFormat} onValueChange={setFileFormat}>
                                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                                    <RadioGroupItem value="json" id="format-json" />
                                    <Label htmlFor="format-json" className="cursor-pointer flex-1">
                                        <div className="flex items-center gap-3">
                                            <FileJson className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium">JSON</p>
                                                <p className="text-xs text-gray-500">Complete data structure, easy to re-import</p>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                                    <RadioGroupItem value="csv" id="format-csv" />
                                    <Label htmlFor="format-csv" className="cursor-pointer flex-1">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium">CSV</p>
                                                <p className="text-xs text-gray-500">Spreadsheet-friendly, per entity type</p>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                                    <RadioGroupItem value="pdf" id="format-pdf" />
                                    <Label htmlFor="format-pdf" className="cursor-pointer flex-1">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-red-600" />
                                            <div>
                                                <p className="font-medium">PDF Report</p>
                                                <p className="text-xs text-gray-500">Professional formatted document</p>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* PDF Template Selection */}
                        {fileFormat === 'pdf' && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                                <Label className="text-base font-semibold">PDF Layout Template</Label>
                                <RadioGroup value={pdfTemplate} onValueChange={setPdfTemplate}>
                                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border hover:border-blue-300 cursor-pointer">
                                        <RadioGroupItem value="summary" id="pdf-summary" />
                                        <Label htmlFor="pdf-summary" className="cursor-pointer flex-1">
                                            <p className="font-medium">Summary Report</p>
                                            <p className="text-xs text-gray-500">High-level overview with charts and totals</p>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border hover:border-blue-300 cursor-pointer">
                                        <RadioGroupItem value="detailed" id="pdf-detailed" />
                                        <Label htmlFor="pdf-detailed" className="cursor-pointer flex-1">
                                            <p className="font-medium">Detailed Transaction List</p>
                                            <p className="text-xs text-gray-500">Complete transaction table with categories</p>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border hover:border-blue-300 cursor-pointer">
                                        <RadioGroupItem value="comprehensive" id="pdf-comprehensive" />
                                        <Label htmlFor="pdf-comprehensive" className="cursor-pointer flex-1">
                                            <p className="font-medium">Comprehensive Report</p>
                                            <p className="text-xs text-gray-500">Summary + detailed breakdown + analysis</p>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel disabled={isExporting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onExport}
                        disabled={isExporting || !Object.values(exportSelections).some(v => v)}
                    >
                        {isExporting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Export {fileFormat.toUpperCase()}
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}