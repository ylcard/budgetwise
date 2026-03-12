/**
 * CREATED: 12-Mar-2026
 * Renders an SVG badge frame ring around a child element.
 * Uses clip-path masking for the avatar and an SVG ring overlay.
 */

import React, { useMemo } from 'react';
import { BADGE_FRAMES } from './avatarConfig';

/**
 * @param {Object} props
 * @param {string} props.badgeId - Badge frame ID from BADGE_FRAMES config
 * @param {number} props.size - Pixel size of the container (default 40)
 * @param {string} props.color - Ring stroke color (CSS value)
 * @param {number} props.progress - 0-100 progress for animated partial ring
 * @param {React.ReactNode} props.children - The avatar element to mask
 * @param {string} props.className - Additional classes
 */
const BadgeFrame = React.memo(({ badgeId = 'circle', size = 40, color = 'hsl(var(--primary))', progress = 100, children, className = '' }) => {
  const badge = useMemo(() => BADGE_FRAMES.find(b => b.id === badgeId) || BADGE_FRAMES[0], [badgeId]);

  // Build the ring SVG markup
  const ringSvg = useMemo(() => {
    if (!badge.ring) return '';
    return badge.ring(size, color);
  }, [badge, size, color]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* SVG Ring Behind */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: ringSvg }}
      />

      {/* Clipped Avatar Content */}
      <div
        className="relative z-10 overflow-hidden flex items-center justify-center"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          clipPath: badge.clipPath,
        }}
      >
        {children}
      </div>
    </div>
  );
});

BadgeFrame.displayName = 'BadgeFrame';
export default BadgeFrame;