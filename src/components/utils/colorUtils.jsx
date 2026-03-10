/**
 * @fileoverview Utility functions for color manipulation and contrast calculations.
 */

/**
 * Converts an HSL color value to RGB.
 *
 * @param {number} h - The hue (0-360).
 * @param {number} s - The saturation (0-100).
 * @param {number} l - The lightness (0-100).
 * @returns {number[]} An array containing [R, G, B] values (0-255).
 */
const hslToRgb = (h, s, l) => {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = n => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = n => lNorm - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
};

/**
 * Blends two colors together based on an alpha value.
 * @param {number[]} base - Base RGB [r, g, b].
 * @param {number[]} overlay - Overlay RGB [r, g, b].
 * @param {number} alpha - Alpha of the overlay (0-1).
 * @returns {number[]} Blended RGB.
 */
const blend = (base, overlay, alpha) => {
  return base.map((val, i) => Math.round(val * (1 - alpha) + overlay[i] * alpha));
};

/**
 * Calculates the perceived brightness of a color string, with optional overlay blending.
 * Supports Hex (#RRGGBB) and HSL (hsl(h, s%, l%)) formats.
 *
 * @param {string} color - The color string to analyze.
 * @param {Object} [options] - Optional blending parameters.
 * @param {string} [options.overlayColor='#ffffff'] - The color of the overlay.
 * @param {number} [options.opacity=0] - The opacity of the overlay (0-1).
 * @returns {number} The perceived brightness value (0-255).
 */
export const getBrightness = (color, options = {}) => {
  if (!color) return 0;
  const { overlayColor = '#ffffff', opacity = 0 } = options;

  let r, g, b;
  let or, og, ob;

  if (color.startsWith('hsl')) {
    const matches = color.match(/\d+/g);
    if (matches) {
      [r, g, b] = hslToRgb(
        parseInt(matches[0], 10),
        parseInt(matches[1], 10),
        parseInt(matches[2], 10)
      );
    }
  } else {
    const hex = color.replace('#', '');
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  // If opacity is provided, blend with the overlay color (usually white/black)
  if (opacity > 0) {
    const oHex = overlayColor.replace('#', '');
    or = parseInt(oHex.substring(0, 2), 16);
    og = parseInt(oHex.substring(2, 4), 16);
    ob = parseInt(oHex.substring(4, 6), 16);
    [r, g, b] = blend([r, g, b], [or, og, ob], opacity);
  }

  return Math.sqrt(0.299 * (r ** 2) + 0.587 * (g ** 2) + 0.114 * (b ** 2));
};

/**
 * Determines the ideal contrasting text color variable based on background brightness.
 * Uses CSS variables from index.css for theme consistency.
 *
 * @param {string} bgColor - The background color string.
 * @param {boolean} [isLightened=false] - Whether the background is lightened (Simple View).
 * @returns {string} A CSS variable string: 'hsl(var(--foreground))' or 'hsl(var(--primary-foreground))'.
 */
export const getContrastingTextColor = (bgColor, isLightened = false) => {
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // If in Simple View, simulate the overlay used in the JSX: 60% White (Light) or 40% Black (Dark)
  const brightness = getBrightness(bgColor, {
    overlayColor: isDarkMode ? '#000000' : '#ffffff',
    opacity: isLightened ? (isDarkMode ? 0.4 : 0.6) : 0
  });

  // Threshold 155 determines the flip point between light and dark text
  return brightness > 155
    ? 'hsl(var(--foreground))'
    : 'hsl(var(--primary-foreground))';
};
