/**
 * CREATED 11-Mar-2026: Accessibility theme picker component.
 * UPDATED 12-Mar-2026: Replaced grid of boxes with a grouped dropdown (Select) for cleaner UX.
 */
import { memo } from 'react';
import { ACCESSIBILITY_THEMES, A11Y_THEME_GROUPS } from '@/components/utils/accessibilityThemes';
// COMMENTED OUT 12-Mar-2026: No longer using grid of boxes
// import { cn } from '@/lib/utils';
// import { Check } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const AccessibilityThemePicker = memo(function AccessibilityThemePicker({ value = 'none', onChange }) {
  const currentTheme = ACCESSIBILITY_THEMES.find(t => t.id === value) || ACCESSIBILITY_THEMES[0];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Accessibility Filter</h3>
        <p className="text-xs text-muted-foreground">Applied on top of your chosen style theme</p>
      </div>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:max-w-xs">
          <div className="flex items-center gap-2">
            <currentTheme.icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Select accessibility filter" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {A11Y_THEME_GROUPS.map((group) => {
            const themes = ACCESSIBILITY_THEMES.filter(t => t.group === group.id);
            if (themes.length === 0) return null;

            return (
              <SelectGroup key={group.id}>
                {group.id !== 'default' && (
                  <SelectLabel className="text-[10px] uppercase tracking-wider">{group.label}</SelectLabel>
                )}
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <SelectItem key={theme.id} value={theme.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm">{theme.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight">{theme.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
});

export default AccessibilityThemePicker;