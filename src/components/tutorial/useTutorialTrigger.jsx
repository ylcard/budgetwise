/**
 * @fileoverview Hook to automatically trigger tutorials
 * CREATED: 24-Feb-2026
 */

import { useEffect } from 'react';
import { useTutorial } from './TutorialContext';

/**
 * Triggers a tutorial if it hasn't been completed yet.
 * * @param {string} tutorialId - ID from TUTORIAL_IDS
 * @param {number} delay - MS to wait before triggering (allows mobile animations to finish)
 * @param {boolean} condition - Optional boolean to delay trigger (e.g., wait for data load)
 */
// test
export const useTutorialTrigger = (tutorialId, delay = 600, condition = true) => {
    const { 
        startTutorial, 
        isTutorialCompleted, 
        tutorialsEnabled, 
        activeTutorial 
    } = useTutorial();

    useEffect(() => {
        // Abort if tutorials are disabled, one is already running, or external conditions aren't met
        if (!tutorialsEnabled || activeTutorial || !condition) return;
        
        // Only trigger if this specific tutorial is not yet completed
        if (!isTutorialCompleted(tutorialId)) {
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
        isTutorialCompleted, 
        startTutorial
    ]);
};
