/**
 * CREATED 12-Mar-2026: Mini app preview card for theme selection.
 * Renders a tiny skeleton dashboard using actual CSS variables from each theme.
 * Used by StyleThemePicker to give a live visual preview of each theme.
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

/**
 * A miniature fake dashboard rendered inside an isolated container.
 * The container gets the theme's data attributes + class so it pulls the correct CSS vars.
 */
const ThemePreviewCard = memo(function ThemePreviewCard({
  label,
  isActive,
  onClick,
  themeClass = '',        // 'dark' | 'light' | ''
  styleThemeAttr = '',    // 'cyberpunk' | ''
}) {
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
      {/* Active check */}
      {isActive && (
        <div className="absolute top-2 right-2 z-20 bg-primary rounded-full p-0.5">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* Preview area — isolated theme scope */}
      <div
        className={cn("w-full aspect-[4/3] overflow-hidden", themeClass)}
        {...(styleThemeAttr ? { 'data-style-theme': styleThemeAttr } : {})}
        style={{ colorScheme: themeClass === 'dark' ? 'dark' : 'light' }}
      >
        <div
          className="w-full h-full p-2 flex flex-col gap-1.5"
          style={{
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
          }}
        >
          {/* Mini header bar */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-md shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(279 94% 54%))' }}
            />
            <div
              className="h-1.5 rounded-full flex-1 max-w-[40%]"
              style={{ backgroundColor: 'hsl(var(--foreground) / 0.15)' }}
            />
          </div>

          {/* Stat cards row */}
          <div className="flex gap-1 flex-1 min-h-0">
            {/* Income card */}
            <div
              className="flex-1 rounded-md p-1.5 flex flex-col justify-between"
              style={{ backgroundColor: 'hsl(var(--stat-income-bg))' }}
            >
              <div
                className="h-1 w-3/5 rounded-full"
                style={{ backgroundColor: 'hsl(var(--stat-income-text) / 0.4)' }}
              />
              <div
                className="h-2 w-4/5 rounded-full mt-auto"
                style={{ backgroundColor: 'hsl(var(--stat-income-text))' }}
              />
            </div>
            {/* Expense card */}
            <div
              className="flex-1 rounded-md p-1.5 flex flex-col justify-between"
              style={{ backgroundColor: 'hsl(var(--stat-expense-bg))' }}
            >
              <div
                className="h-1 w-3/5 rounded-full"
                style={{ backgroundColor: 'hsl(var(--stat-expense-text) / 0.4)' }}
              />
              <div
                className="h-2 w-4/5 rounded-full mt-auto"
                style={{ backgroundColor: 'hsl(var(--stat-expense-text))' }}
              />
            </div>
            {/* Balance card */}
            <div
              className="flex-1 rounded-md p-1.5 flex flex-col justify-between"
              style={{ backgroundColor: 'hsl(var(--stat-balance-pos-bg))' }}
            >
              <div
                className="h-1 w-3/5 rounded-full"
                style={{ backgroundColor: 'hsl(var(--stat-balance-pos-text) / 0.4)' }}
              />
              <div
                className="h-2 w-4/5 rounded-full mt-auto"
                style={{ backgroundColor: 'hsl(var(--stat-balance-pos-text))' }}
              />
            </div>
          </div>

          {/* Transaction list skeleton */}
          <div
            className="flex-1 rounded-md p-1.5 flex flex-col gap-1 min-h-0"
            style={{ backgroundColor: 'hsl(var(--card))' }}
          >
            {[0.7, 0.5, 0.6].map((w, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'hsl(var(--muted))' }}
                />
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    backgroundColor: 'hsl(var(--foreground) / 0.12)',
                    width: `${w * 100}%`,
                  }}
                />
                <div
                  className="h-1.5 w-5 rounded-full ml-auto"
                  style={{ backgroundColor: 'hsl(var(--foreground) / 0.08)' }}
                />
              </div>
            ))}
          </div>

          {/* Bottom nav bar */}
          <div
            className="flex items-center justify-around rounded-md py-1"
            style={{ backgroundColor: 'hsl(var(--card))' }}
          >
            {[1, 2, 3, 4].map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor: i === 0
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted-foreground) / 0.3)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-2 py-2 text-center" style={{ backgroundColor: 'hsl(var(--card))' }}>
        <span className={cn(
          "text-xs font-semibold",
          isActive ? "text-primary" : "text-muted-foreground"
        )}>
          {label}
        </span>
      </div>
    </button>
  );
});

export default ThemePreviewCard;