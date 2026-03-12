/**
 * CREATED: 12-Mar-2026
 * Avatar & Badge configuration for the gamification system.
 * Defines DiceBear avatar styles and badge frame shapes, each gated by level.
 */

// ============================================================
// AVATAR STYLES - DiceBear collection style IDs
// ============================================================
export const AVATAR_STYLES = [
  { id: 'initials',       label: 'Initials',       unlockLevel: 1, description: 'Classic letter avatar' },
  { id: 'bottts',         label: 'Bottts',         unlockLevel: 1, description: 'Friendly robots' },
  { id: 'thumbs',         label: 'Thumbs',         unlockLevel: 1, description: 'Thumbs-up characters' },
  { id: 'shapes',         label: 'Shapes',         unlockLevel: 2, description: 'Geometric shapes' },
  { id: 'icons',          label: 'Icons',          unlockLevel: 2, description: 'Simple icons' },
  { id: 'pixelArt',       label: 'Pixel Art',      unlockLevel: 3, description: '8-bit characters' },
  { id: 'adventurer',     label: 'Adventurer',     unlockLevel: 4, description: 'RPG adventurers' },
  { id: 'bigEars',        label: 'Big Ears',       unlockLevel: 5, description: 'Cute big-eared people' },
  { id: 'lorelei',        label: 'Lorelei',        unlockLevel: 6, description: 'Elegant portraits' },
  { id: 'notionists',     label: 'Notionists',     unlockLevel: 7, description: 'Artistic doodles' },
  { id: 'openPeeps',      label: 'Open Peeps',     unlockLevel: 8, description: 'Hand-drawn peeps' },
  { id: 'personas',       label: 'Personas',       unlockLevel: 9, description: 'Stylish personas' },
  { id: 'funEmoji',       label: 'Fun Emoji',      unlockLevel: 10, description: 'Expressive emojis' },
];

// ============================================================
// BADGE FRAMES - SVG clip-path / border shapes around avatar
// ============================================================
export const BADGE_FRAMES = [
  {
    id: 'circle',
    label: 'Circle',
    unlockLevel: 1,
    description: 'Standard circle',
    // clipPath for the avatar mask
    clipPath: 'circle(50% at 50% 50%)',
    // SVG ring element rendered behind the avatar
    ring: (size, color) => `<circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" stroke="${color}" stroke-width="3" fill="none"/>`,
  },
  {
    id: 'rounded-square',
    label: 'Rounded Square',
    unlockLevel: 2,
    description: 'Rounded rectangle',
    clipPath: 'inset(0 round 20%)',
    ring: (size, color) => `<rect x="2" y="2" width="${size-4}" height="${size-4}" rx="${size*0.2}" stroke="${color}" stroke-width="3" fill="none"/>`,
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    unlockLevel: 3,
    description: 'Hexagonal frame',
    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
    ring: (size, color) => {
      const s = size;
      return `<polygon points="${s/2},2 ${s*0.93},${s*0.25} ${s*0.93},${s*0.75} ${s/2},${s-2} ${s*0.07},${s*0.75} ${s*0.07},${s*0.25}" stroke="${color}" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
    },
  },
  {
    id: 'diamond',
    label: 'Diamond',
    unlockLevel: 5,
    description: 'Diamond shape',
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    ring: (size, color) => {
      const s = size;
      return `<polygon points="${s/2},2 ${s-2},${s/2} ${s/2},${s-2} 2,${s/2}" stroke="${color}" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
    },
  },
  {
    id: 'shield',
    label: 'Shield',
    unlockLevel: 7,
    description: 'Shield crest',
    clipPath: 'polygon(50% 0%, 100% 10%, 100% 60%, 50% 100%, 0% 60%, 0% 10%)',
    ring: (size, color) => {
      const s = size;
      return `<polygon points="${s/2},2 ${s-2},${s*0.1} ${s-2},${s*0.6} ${s/2},${s-2} 2,${s*0.6} 2,${s*0.1}" stroke="${color}" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
    },
  },
  {
    id: 'star',
    label: 'Star',
    unlockLevel: 10,
    description: 'Star-shaped frame',
    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    ring: (size, color) => {
      const s = size;
      return `<polygon points="${s/2},2 ${s*0.61},${s*0.35} ${s*0.98},${s*0.35} ${s*0.68},${s*0.57} ${s*0.79},${s*0.91} ${s/2},${s*0.7} ${s*0.21},${s*0.91} ${s*0.32},${s*0.57} ${s*0.02},${s*0.35} ${s*0.39},${s*0.35}" stroke="${color}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`;
    },
  },
];

/**
 * Returns avatar styles available to a given level.
 * @param {number} level - Current user level
 * @returns {{ unlocked: Array, locked: Array }}
 */
export const getAvatarsByLevel = (level) => {
  const unlocked = AVATAR_STYLES.filter(s => s.unlockLevel <= level);
  const locked = AVATAR_STYLES.filter(s => s.unlockLevel > level);
  return { unlocked, locked };
};

/**
 * Returns badge frames available to a given level.
 * @param {number} level - Current user level
 * @returns {{ unlocked: Array, locked: Array }}
 */
export const getBadgesByLevel = (level) => {
  const unlocked = BADGE_FRAMES.filter(b => b.unlockLevel <= level);
  const locked = BADGE_FRAMES.filter(b => b.unlockLevel > level);
  return { unlocked, locked };
};