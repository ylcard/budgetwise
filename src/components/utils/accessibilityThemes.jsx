/**
 * CREATED 11-Mar-2026: Accessibility theme definitions.
 * Each theme maps to a `data-a11y-theme` attribute value on <html>.
 * CSS overrides live in index.css.
 */

import { Eye, EyeOff, SunDim, Contrast, MonitorSmartphone, Focus, CircleDot } from 'lucide-react';

export const ACCESSIBILITY_THEMES = [
  { id: 'none', label: 'None', description: 'Default app colors', icon: Eye, group: 'default' },
  { id: 'deuteranopia', label: 'Red-Green CVD', description: 'Deuteranopia & Protanopia safe', icon: EyeOff, group: 'color-vision' },
  { id: 'tritanopia', label: 'Blue-Yellow CVD', description: 'Tritanopia safe palette', icon: EyeOff, group: 'color-vision' },
  { id: 'monochromacy', label: 'Monochrome', description: 'Luminance-only, no color', icon: CircleDot, group: 'color-vision' },
  { id: 'high-contrast', label: 'High Contrast', description: 'WCAG AAA standard', icon: Contrast, group: 'visibility' },
  { id: 'oled', label: 'Pitch Black', description: 'OLED / light sensitivity', icon: MonitorSmartphone, group: 'visibility' },
  { id: 'sepia', label: 'Sepia / Warm', description: 'Blue light reduction', icon: SunDim, group: 'comfort' },
  { id: 'focus', label: 'Focus Mode', description: 'ADHD / dyslexia support', icon: Focus, group: 'comfort' },
];

export const A11Y_THEME_GROUPS = [
  { id: 'default', label: 'Default' },
  { id: 'color-vision', label: 'Color Vision' },
  { id: 'visibility', label: 'Visibility' },
  { id: 'comfort', label: 'Comfort & Focus' },
];

/**
 * Applies or removes the accessibility theme data attribute on <html>.
 * @param {string} themeId - The theme id (or 'none' to clear).
 */
export function applyA11yTheme(themeId) {
  const root = document.documentElement;
  if (!themeId || themeId === 'none') {
    root.removeAttribute('data-a11y-theme');
  } else {
    root.setAttribute('data-a11y-theme', themeId);
  }
}