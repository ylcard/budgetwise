import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * InfoTooltip Component
 * CREATED: 16-Jan-2026
 * 
 * A reusable tooltip component that displays an info icon with a popup
 * containing a description and optional Wikipedia link.
 * 
 * @param {string} title - The title/heading for the tooltip
 * @param {string} description - The explanatory text
 * @param {string} wikiUrl - Optional Wikipedia URL for more information
 */
export default function InfoTooltip({ title, description, wikiUrl }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className="inline-flex items-center justify-center ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                        type="button"
                        onClick={(e) => e.preventDefault()}
                    >
                        <Info className="w-3.5 h-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-[240px] p-3 bg-white border border-gray-200 shadow-xl rounded-lg animate-in fade-in zoom-in duration-200"
                >
                    <div className="space-y-1.5">
                        {title && (
                            <p className="font-bold text-sm text-gray-900 leading-none">{title}</p>
                        )}
                        <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            {description}
                        </p>
                        {wikiUrl && (
                            <div className="pt-1">
                                <a
                                    href={wikiUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5 font-semibold"
                                >
                                    Learn more on Wikipedia →
                                </a>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}