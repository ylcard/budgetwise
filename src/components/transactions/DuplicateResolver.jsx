import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { ArrowRight, Trash2, Check, Copy, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyUtils";
import { useSettings } from "@/components/utils/SettingsContext";

export default function DuplicateResolver({ 
    newTx,       // The new transaction from Import/Form
    survivorTx,  // The existing transaction from DB
    onKeepSurvivor, // Action: Discard new, keep old (maybe copy notes)
    onKeepBoth,     // Action: Create new anyway (it's not a duplicate)
    onOverwrite     // Action: Update old with new data, discard new
}) {
    const { settings } = useSettings();

    return (
        <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-semibold text-sm">Potential Duplicate Detected</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                
                {/* LEFT: SURVIVOR (EXISTING) */}
                <div className="bg-white p-3 rounded border border-gray-200 shadow-sm opacity-75">
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">
                        Existing (In Database)
                    </div>
                    <div className="font-medium text-gray-900">{survivorTx.title}</div>
                    <div className="text-sm text-gray-500">{survivorTx.date}</div>
                    <div className="flex gap-2 mt-2 text-xs">
                        <Badge variant="outline">{survivorTx.category_name || 'Uncategorized'}</Badge>
                        {survivorTx.bankTransactionId && <Badge variant="secondary" className="px-1">Synced</Badge>}
                    </div>
                    {survivorTx.notes && (
                        <div className="mt-2 text-xs text-gray-500 italic bg-gray-50 p-1 rounded">
                            "{survivorTx.notes}"
                        </div>
                    )}
                </div>

                {/* CENTER: ACTION ARROWS */}
                <div className="flex md:flex-col justify-center gap-2">
                    <ArrowRight className="w-5 h-5 text-amber-400 rotate-90 md:rotate-0" />
                </div>

                {/* RIGHT: CANDIDATE (NEW) */}
                <div className="bg-white p-3 rounded border-2 border-amber-400 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl">
                        NEW IMPORT
                    </div>
                    <div className="text-[10px] uppercase font-bold text-amber-600 mb-1 tracking-wider">
                        Potential Duplicate
                    </div>
                    <div className="font-medium text-gray-900">{newTx.title}</div>
                    <div className="text-sm text-gray-500">{newTx.date}</div>
                    <div className="flex gap-2 mt-2 text-xs">
                         <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                            {newTx.category || 'Uncategorized'}
                         </Badge>
                    </div>
                    {/* Highlight diff if amounts differ slightly */}
                    <div className="mt-2 font-bold text-lg">
                        {formatCurrency(newTx.amount, settings)}
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-amber-200/50 justify-end">
                <CustomButton 
                    size="sm" 
                    variant="outline" 
                    onClick={onKeepBoth}
                    className="text-gray-600 border-gray-300"
                >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    Keep Both (Not Duplicate)
                </CustomButton>
                
                <CustomButton 
                    size="sm" 
                    variant="default" // Primary Action: Discard the new one, keep the old one
                    onClick={onKeepSurvivor}
                    className="bg-green-600 hover:bg-green-700 text-white border-none"
                >
                    <Check className="w-3.5 h-3.5 mr-2" />
                    Discard New & Keep Existing
                </CustomButton>

               {/* Optional: "Update Old" if you want to allow overwriting categories */}
               {/* <CustomButton size="sm" variant="ghost" onClick={onOverwrite} className="text-amber-700 hover:text-amber-900 hover:bg-amber-100">
                    Update Existing with New Info
                </CustomButton> 
               */}
            </div>
        </div>
    );
}
