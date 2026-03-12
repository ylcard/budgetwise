/**
 * CREATED 12-Mar-2026: Mini app preview card for theme selection.
 * Renders a tiny skeleton dashboard using hardcoded color tokens per theme.
 * CSS variables don't properly isolate in nested divs (they inherit from :root),
 * so we use a static color map to guarantee accurate previews.
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

/**
 * Static color palettes per theme ID for truly isolated previews.
 * Each key maps to the resolved HSL values from index.css / globals.css.
 */
const THEME_PALETTES = {
  light: {
    background: '#ffffff',
    foreground: '#0a0a0a',
    card: '#ffffff',
    primary: '#171717',
    muted: '#f5f5f5',
    mutedFg: '#737373',
    border: '#e5e5e5',
    incBg: '#ecfdf5', incText: '#166534',
    expBg: '#fef2f2', expText: '#991b1b',
    balBg: '#eff6ff', balText: '#2563eb',
  },
  dark: {
    background: '#0a0a0a',
    foreground: '#fafafa',
    card: '#0a0a0a',
    primary: '#fafafa',
    muted: '#262626',
    mutedFg: '#a1a1a1',
    border: '#262626',
    incBg: '#052e16', incText: '#4ade80',
    expBg: '#2a0a0a', expText: '#f87171',
    balBg: '#0a1a3a', balText: '#60a5fa',
  },
  cyberpunk: {
    background: '#0c0e1a',
    foreground: '#ffe066',
    card: '#10131f',
    primary: '#facc15',
    muted: '#1a1d2e',
    mutedFg: '#5a6a80',
    border: '#1e2236',
    incBg: '#0a1f1f', incText: '#00e5cc',
    expBg: '#1f0a1f', expText: '#e040a0',
    balBg: '#1a1a05', balText: '#facc15',
  },
};

const ThemePreviewCard = memo(function ThemePreviewCard({
  label,
  isActive,
  onClick,
  paletteId = 'light', // key into THEME_PALETTES
}) {
  const p = THEME_PALETTES[paletteId] || THEME_PALETTES.light;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-xl border-2 transition-all overflow-hidden group",
        isActive
          ? "border-primary shadow-md ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:shadow-sm"
      )}
    >
      {isActive && (
        <div className="absolute top-2 right-2 z-20 bg-primary rounded-full p-0.5">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* Preview — fully inline-styled for isolation */}
      <div className="w-full aspect-[4/3] overflow-hidden">
        <div
          className="w-full h-full p-2 flex flex-col gap-1.5"
          style={{ backgroundColor: p.background, color: p.foreground }}
        >
          {/* Mini header */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-md shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7)' }}
            />
            <div className="h-1.5 rounded-full flex-1 max-w-[40%]" style={{ backgroundColor: p.muted }} />
          </div>

          {/* Stat cards */}
          <div className="flex gap-1 flex-1 min-h-0">
            <div className="flex-1 rounded-md p-1.5 flex flex-col justify-between" style={{ backgroundColor: p.incBg }}>
              <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: p.incText + '66' }} />
              <div className="h-2 w-4/5 rounded-full mt-auto" style={{ backgroundColor: p.incText }} />
            </div>
            <div className="flex-1 rounded-md p-1.5 flex flex-col justify-between" style={{ backgroundColor: p.expBg }}>
              <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: p.expText + '66' }} />
              <div className="h-2 w-4/5 rounded-full mt-auto" style={{ backgroundColor: p.expText }} />
            </div>
            <div className="flex-1 rounded-md p-1.5 flex flex-col justify-between" style={{ backgroundColor: p.balBg }}>
              <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: p.balText + '66' }} />
              <div className="h-2 w-4/5 rounded-full mt-auto" style={{ backgroundColor: p.balText }} />
            </div>
          </div>

          {/* Transaction list skeleton */}
          <div className="flex-1 rounded-md p-1.5 flex flex-col gap-1 min-h-0" style={{ backgroundColor: p.card, border: `1px solid ${p.border}` }}>
            {[0.7, 0.5, 0.6].map((w, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.muted }} />
                <div className="h-1.5 rounded-full" style={{ backgroundColor: p.mutedFg + '30', width: `${w * 100}%` }} />
                <div className="h-1.5 w-5 rounded-full ml-auto" style={{ backgroundColor: p.mutedFg + '20' }} />
              </div>
            ))}
          </div>

          {/* Bottom nav */}
          <div className="flex items-center justify-around rounded-md py-1" style={{ backgroundColor: p.card, border: `1px solid ${p.border}` }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: i === 0 ? p.primary : p.mutedFg + '50' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-2 py-2 text-center bg-card">
        <span className={cn("text-xs font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
          {label}
        </span>
      </div>
    </button>
  );
});

export default ThemePreviewCard;