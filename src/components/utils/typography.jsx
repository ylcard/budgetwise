// ADDED 03-Mar-2026: Typography.js integration using the Moraga theme
// Moraga is a clean, modern sans-serif theme ideal for professional financial apps.
import Typography from 'typography';
import moragaTheme from 'typography-theme-moraga';

const typography = new Typography(moragaTheme) ({
  baseFontSize: '12px',
});
// Inject the generated CSS styles directly into the document <head>
// This is the recommended approach for client-only React apps (no SSR).
typography.injectStyles();

export default typography;
export const { scale, rhythm, options } = typography;