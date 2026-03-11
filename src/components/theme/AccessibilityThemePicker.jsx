/**
 * CREATED 11-Mar-2026: Accessibility theme picker component.
 * Renders grouped grid of accessibility theme options.
 */
import { memo } from 'react';
import { ACCESSIBILITY_THEMES, A11Y_THEME_GROUPS } from '@/components/utils/accessibilityThemes';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const AccessibilityThemePicker = memo(function AccessibilityThemePicker({ value = 'none', onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Accessibility</h3>
        <p className="text-xs text-muted-foreground">Colour palettes optimised for visual needs</p>
      </div>

      {A11Y_THEME_GROUPS.map((group) => {
        const themes = ACCESSIBILITY_THEMES.filter(t => t.group === group.id);
        if (themes.length === 0) return null;

        return (
          <div key={group.id} className="space-y-2">
            {group.id !== 'default' && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {themes.map((theme) => {
                const Icon = theme.icon;
                const isActive = value === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onChange(theme.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-accent/50"
                    )}
                  >
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium leading-tight", isActive ? "text-foreground" : "text-muted-foreground")}>
                      {theme.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground/70 leading-tight">
                      {theme.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default AccessibilityThemePicker;