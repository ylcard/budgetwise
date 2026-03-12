/**
 * CREATED 11-Mar-2026: Style / cosmetic theme picker.
 * Lets users choose fun visual themes (cyberpunk, etc.) that override the entire palette.
 * Separate from the accessibility theme picker.
 * UPDATED 12-Mar-2026: Replaced bland boxes with live ThemePreviewCard previews.
 */
import { memo } from 'react';
// COMMENTED OUT 12-Mar-2026: No longer using inline icon boxes
// import { cn } from '@/lib/utils';
// import { Check, Palette, Zap } from 'lucide-react';
import ThemePreviewCard from './ThemePreviewCard';

export const STYLE_THEMES = [
  { id: 'none', label: 'Light', themeClass: 'light', styleAttr: '' },
  { id: 'none-dark', label: 'Dark', themeClass: 'dark', styleAttr: '' },
  { id: 'cyberpunk', label: 'Cyberpunk', themeClass: 'dark', styleAttr: 'cyberpunk' },
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

/**
 * Resolves the effective value for comparison.
 * The parent stores 'none' for default. We distinguish light/dark via the mode picker,
 * so both 'none' and 'none-dark' map to style theme 'none' for the parent.
 * We use an internal "visual ID" to track which preview card is selected.
 */
const resolveVisualId = (parentValue, isDarkMode) => {
  if (parentValue && parentValue !== 'none') return parentValue;
  return isDarkMode ? 'none-dark' : 'none';
};

const StyleThemePicker = memo(function StyleThemePicker({ value = 'none', onChange, isDarkMode = false }) {
  const visualId = resolveVisualId(value, isDarkMode);

  const handleSelect = (theme) => {
    // For 'none' and 'none-dark', the parent receives 'none' — mode picker handles light/dark
    const parentValue = theme.id === 'none-dark' ? 'none' : theme.id;
    onChange(parentValue);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Style Themes</h3>
        <p className="text-xs text-muted-foreground">Choose your app's visual style</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {STYLE_THEMES.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            label={theme.label}
            isActive={visualId === theme.id}
            onClick={() => handleSelect(theme)}
            themeClass={theme.themeClass}
            styleThemeAttr={theme.styleAttr}
          />
        ))}
      </div>
    </div>
  );
});

export default StyleThemePicker;