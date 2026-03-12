/**
 * CREATED: 12-Mar-2026
 * Avatar & Badge picker UI for the gamification profile.
 * Allows users to select an avatar style, randomize seed, and choose a badge frame.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { AVATAR_STYLES, BADGE_FRAMES, getAvatarsByLevel, getBadgesByLevel } from './avatarConfig';
import { useAvatarImage } from './useAvatarImage';
import BadgeFrame from './BadgeFrame';
import { Lock, RefreshCw, Check } from 'lucide-react';
import { CustomButton } from '@/components/ui/CustomButton';
import { motion, AnimatePresence } from 'framer-motion';
import { createAvatar } from '@dicebear/core';
import * as collection from '@dicebear/collection';

// ============================================================
// Inline mini-preview to avoid hook-in-loop: generates data-URI directly
// ============================================================
const getPreviewUri = (styleId, seed) => {
  if (!styleId || styleId === 'initials' || !seed) return null;
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
  const styleObj = styleMap[styleId];
  if (!styleObj) return null;
  return createAvatar(styleObj, { seed, size: 64 }).toDataUri();
};

/**
 * @param {Object} props
 * @param {number} props.level - Current gamification level
 * @param {string} props.currentStyle - Currently selected avatar style ID
 * @param {string} props.currentBadge - Currently selected badge frame ID
 * @param {string} props.currentSeed - Current avatar seed
 * @param {string} props.userName - User's display name (for initials fallback)
 * @param {Function} props.onSave - Callback({style, badge, seed}) when user confirms
 * @param {boolean} props.isSaving - Loading state
 */
const AvatarPicker = React.memo(({ level, currentStyle, currentBadge, currentSeed, userName, onSave, isSaving }) => {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle || 'initials');
  const [selectedBadge, setSelectedBadge] = useState(currentBadge || 'circle');
  const [seed, setSeed] = useState(currentSeed || userName || 'default');

  const { unlocked: unlockedAvatars, locked: lockedAvatars } = useMemo(() => getAvatarsByLevel(level), [level]);
  const { unlocked: unlockedBadges, locked: lockedBadges } = useMemo(() => getBadgesByLevel(level), [level]);

  // Live preview of the selected avatar
  const previewUri = useMemo(() => getPreviewUri(selectedStyle, seed), [selectedStyle, seed]);

  const randomizeSeed = useCallback(() => {
    setSeed(`${userName || 'user'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  }, [userName]);

  const handleSave = useCallback(() => {
    onSave({ style: selectedStyle, badge: selectedBadge, seed });
  }, [selectedStyle, selectedBadge, seed, onSave]);

  const hasChanges = selectedStyle !== currentStyle || selectedBadge !== currentBadge || seed !== currentSeed;

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="flex flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedStyle}-${selectedBadge}-${seed}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <BadgeFrame badgeId={selectedBadge} size={96} color="hsl(var(--primary))">
              {previewUri ? (
                <img src={previewUri} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {userName?.substring(0, 2).toUpperCase() || 'BW'}
                </div>
              )}
            </BadgeFrame>
          </motion.div>
        </AnimatePresence>

        {selectedStyle !== 'initials' && (
          <CustomButton variant="ghost" size="sm" onClick={randomizeSeed} className="gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Randomize
          </CustomButton>
        )}
      </div>

      {/* Avatar Style Picker */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Avatar Style</h4>
        <div className="grid grid-cols-4 gap-2">
          {unlockedAvatars.map((style) => {
            const preview = style.id === 'initials' ? null : getPreviewUri(style.id, seed);
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                  {preview ? (
                    <img src={preview} alt={style.label} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-primary">AB</span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center truncate w-full">{style.label}</span>
              </button>
            );
          })}

          {lockedAvatars.map((style) => (
            <div
              key={style.id}
              className="relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 border-border bg-muted/20 opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center truncate w-full">{style.label}</span>
              <span className="text-[8px] text-muted-foreground/60">Lvl {style.unlockLevel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Badge Frame Picker */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Profile Badge</h4>
        <div className="grid grid-cols-3 gap-2">
          {unlockedBadges.map((badge) => {
            const isSelected = selectedBadge === badge.id;
            return (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge.id)}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
                <BadgeFrame badgeId={badge.id} size={44} color={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}>
                  <div className="w-full h-full bg-muted/50 rounded-full" />
                </BadgeFrame>
                <span className="text-[10px] font-medium text-muted-foreground">{badge.label}</span>
              </button>
            );
          })}

          {lockedBadges.map((badge) => (
            <div
              key={badge.id}
              className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-border bg-muted/20 opacity-50 cursor-not-allowed"
            >
              <div className="w-11 h-11 flex items-center justify-center">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{badge.label}</span>
              <span className="text-[8px] text-muted-foreground/60">Lvl {badge.unlockLevel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <CustomButton
        variant="create"
        className="w-full"
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Profile'}
      </CustomButton>
    </div>
  );
});

AvatarPicker.displayName = 'AvatarPicker';
export default AvatarPicker;