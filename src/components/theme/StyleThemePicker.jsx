/**
 * CREATED 11-Mar-2026: Style / cosmetic theme picker.
 * Lets users choose fun visual themes (cyberpunk, etc.) that override the entire palette.
 * Separate from the accessibility theme picker.
 */
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Palette, Zap } from 'lucide-react';

export const STYLE_THEMES = [
  { id: 'none', label: 'Default', description: 'Standard app look', icon: Palette },
  { id: 'cyberpunk', label: 'Cyberpunk', description: 'Neon-soaked Night City', icon: Zap },
];

/**
 * Applies or removes the cosmetic style theme on <html>.
 * @param {string} themeId
 */
export function applyStyleTheme(themeId) {
  const root = document.documentElement;
  if (!themeId || themeId === 'none') {
    root.removeAttribute('data-style-theme');
  } else {
    root.setAttribute('data-style-theme', themeId);
  }
}

const StyleThemePicker = memo(function StyleThemePicker({ value = 'none', onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Style Themes</h3>
        <p className="text-xs text-muted-foreground">Cosmetic palette overrides — pick a vibe</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STYLE_THEMES.map((theme) => {
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
});

export default StyleThemePicker;