import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect"; // ADDED 03-Feb-2026: iOS-style action sheets
import { ArrowRight } from "lucide-react";

const REQUIRED_FIELDS = [
    { key: 'date', label: 'Date', required: true },
    { key: 'amount', label: 'Amount', required: true },
    { key: 'title', label: 'Description/Title', required: true },
    { key: 'type', label: 'Type (Income/Expense)', required: false },
    { key: 'category', label: 'Category', required: false }
];

export default function ColumnMapper({ headers, mappings, onMappingChange }) {
    // ADDED 03-Feb-2026: Prepare options for MobileDrawerSelect
    const headerOptions = headers.map(header => ({
        value: header,
        label: header
    }));

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Map CSV Columns</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    {REQUIRED_FIELDS.map((field) => {
                        const selectedHeader = mappings[field.key] || "";
                        const selectedOption = headerOptions.find(opt => opt.value === selectedHeader);
                        
                        return (
                            <div key={field.key} className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-4">
                                <div>
                                    <Label className="text-base font-medium">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <p className="text-xs text-gray-500">App Field</p>
                                </div>

                                <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />

                                {/* WRAPPED 03-Feb-2026: MobileDrawerSelect for iOS native feel */}
                                <MobileDrawerSelect
                                    value={selectedHeader}
                                    onValueChange={(value) => onMappingChange(field.key, value)}
                                    options={headerOptions}
                                    placeholder="Select CSV Column"
                                    selectedLabel={selectedOption?.label}
                                >
                                    <Select
                                        value={selectedHeader}
                                        onValueChange={(value) => onMappingChange(field.key, value)}
                                    >
                                        <SelectTrigger className={!mappings[field.key] && field.required ? "border-red-300" : ""}>
                                            <SelectValue placeholder="Select CSV Column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {headers.map((header) => (
                                                <SelectItem key={header} value={header}>
                                                    {header}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </MobileDrawerSelect>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}