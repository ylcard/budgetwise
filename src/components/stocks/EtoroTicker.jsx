import { useEtoroData } from '../hooks/useEtoroData';
import { Loader2 } from 'lucide-react';

export default function EtoroTicker() {
  const { positions, status, totalValue } = useEtoroData();

  if (status === "Error") return null; // Hide on error

  return (
    <div className="w-full bg-slate-900 text-white py-2.5 flex items-center shadow-md border-b border-slate-800">
      {/* Status Indicator */}
      <div className="px-4 flex items-center gap-2 border-r border-slate-700 bg-slate-900 sticky left-0 z-10 shadow-[4px_0_10px_rgba(15,23,42,0.9)]">
        <div className={`h-2 w-2 rounded-full ${status === 'Live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        <span className="text-xs font-bold tracking-wider">eToro</span>
      </div>

      {/* Scrolling Content */}
      <div className="flex items-center gap-8 px-4 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
        {status === "Syncing..." && (
            <span className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing Portfolio...
            </span>
        )}

        {positions.map((pos, idx) => (
          <div key={`${pos.InstrumentID || idx}`} className="flex items-center gap-2 text-sm">
            <span className="font-bold text-slate-200">{pos.InstrumentDisplayName || pos.Symbol || 'Asset'}</span>
            <span className="font-mono text-slate-300">
                ${(pos.Amount || pos.Value || pos.NetCashValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            {pos.Profit && (
                <span className={`text-xs ${pos.Profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.Profit >= 0 ? '+' : ''}{pos.Profit.toFixed(2)}
                </span>
            )}
          </div>
        ))}

        {/* Total (Optional) */}
        {positions.length > 0 && (
            <div className="flex items-center gap-2 text-sm border-l border-slate-700 pl-4 ml-4">
                <span className="text-slate-400">Total Equity:</span>
                <span className="font-bold text-green-400">${totalValue.toFixed(2)}</span>
            </div>
        )}
      </div>
      
      {/* Tailwind Custom Class Note: You need 'animate-marquee' in tailwind.config 
          or just use overflow-x-auto for a swipeable list on mobile */}
      <style>{`
        .hover\\:pause:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}