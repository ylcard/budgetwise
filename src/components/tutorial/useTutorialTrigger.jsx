/**
 * @fileoverview Hook to automatically trigger tutorials
 * CREATED: 24-Feb-2026
 */

import { useEffect, useRef } from 'react';
import { useTutorial } from './TutorialContext';

/**
 * Triggers a tutorial if it hasn't been completed yet.
 * * @param {string} tutorialId - ID from TUTORIAL_IDS
 * @param {number} delay - MS to wait before triggering (allows mobile animations to finish)
 * @param {boolean} condition - Optional boolean to delay trigger (e.g., wait for data load)
 */
export const useTutorialTrigger = (tutorialId, delay = 600, condition = true) => {
  const {
    startTutorial,
    isTutorialCompleted,
    completedTutorials,
    tutorialsEnabled,
    activeTutorial,
    isReady
  } = useTutorial();

  const hasTriggered = useRef(false);

  useEffect(() => {
    // Abort if completedTutorials is undefined (DB hasn't responded yet)
    if (!isReady || !tutorialsEnabled || activeTutorial || !condition || hasTriggered.current || completedTutorials === undefined) return;

    // Only trigger if this specific tutorial is not yet completed
    if (!isTutorialCompleted(tutorialId)) {
      hasTriggered.current = true; // Lock the trigger so it doesn't loop
      const timer = setTimeout(() => {
        startTutorial(tutorialId);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [
    tutorialId,
    delay,
    condition,
    tutorialsEnabled,
    activeTutorial,
    completedTutorials,
    isTutorialCompleted,
    startTutorial,
    isReady
  ]);
};
