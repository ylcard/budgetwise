import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Building2, Search, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Bank Selection Dialog
 * CREATED: 26-Jan-2026
 * 
 * Allows users to search and select their bank from Enable Banking ASPSPs
 */

export default function BankSelectionDialog({ 
    open, 
    onOpenChange, 
    banks, 
    onSelectBank,
    isLoading 
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(null);

    // Get unique countries
    const countries = useMemo(() => {
        if (!banks) return [];
        const countrySet = new Set(banks.map(b => b.country));
        return Array.from(countrySet).sort();
    }, [banks]);

    // Filter banks
    const filteredBanks = useMemo(() => {
        if (!banks) return [];
        
        let filtered = banks;
        
        if (selectedCountry) {
            filtered = filtered.filter(b => b.country === selectedCountry);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(b => 
                b.name?.toLowerCase().includes(term) ||
                b.country?.toLowerCase().includes(term)
            );
        }
        
        return filtered;
    }, [banks, searchTerm, selectedCountry]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Connect Your Bank</DialogTitle>
                    <DialogDescription>
                        Select your bank to securely connect and sync transactions
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search banks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Country Filter */}
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={!selectedCountry ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => setSelectedCountry(null)}
                            >
                                All Countries
                            </Badge>
                            {countries.map(country => (
                                <Badge
                                    key={country}
                                    variant={selectedCountry === country ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => setSelectedCountry(country)}
                                >
                                    {country}
                                </Badge>
                            ))}
                        </div>

                        {/* Bank List */}
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-2">
                                {filteredBanks.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        No banks found
                                    </div>
                                ) : (
                                    filteredBanks.map((bank) => (
                                        <div
                                            key={bank.name}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                            onClick={() => onSelectBank(bank)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                    <Building2 className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{bank.name}</p>
                                                    <p className="text-sm text-gray-500">{bank.country}</p>
                                                </div>
                                            </div>
                                            <CustomButton
                                                variant="modify"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectBank(bank);
                                                }}
                                            >
                                                Connect
                                            </CustomButton>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}