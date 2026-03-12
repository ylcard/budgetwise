/**
 * CREATED: 12-Mar-2026
 * Hook: Generates a DiceBear avatar data-URI from style + seed.
 * Returns a memoized image URL string.
 */

import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import * as collection from '@dicebear/collection';

/**
 * @param {string} style - DiceBear style key (e.g. 'bottts', 'adventurer')
 * @param {string} seed - Seed string for deterministic generation
 * @returns {string|null} Data-URI of the generated SVG avatar, or null for 'initials'
 */
export const useAvatarImage = (style, seed) => {
  return useMemo(() => {
    if (!style || style === 'initials' || !seed) return null;

    // Map our config IDs to the actual DiceBear collection exports
    const styleMap = {
      bottts: collection.bottts,
      thumbs: collection.thumbs,
      shapes: collection.shapes,
      icons: collection.icons,
      pixelArt: collection.pixelArt,
      adventurer: collection.adventurer,
      bigEars: collection.bigEars,
      lorelei: collection.lorelei,
      notionists: collection.notionists,
      openPeeps: collection.openPeeps,
      personas: collection.personas,
      funEmoji: collection.funEmoji,
    };

    const styleObj = styleMap[style];
    if (!styleObj) return null;

    const avatar = createAvatar(styleObj, {
      seed,
      size: 128,
    });

    return avatar.toDataUri();
  }, [style, seed]);
};