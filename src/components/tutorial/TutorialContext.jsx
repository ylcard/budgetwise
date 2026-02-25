/**
 * @fileoverview Tutorial System Context Provider
 * CREATED: 15-Feb-2026
 * 
 * Manages tutorial state, progress tracking, and user preferences.
 * Persists tutorial completion status in UserSettings entity.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSettings } from '../utils/SettingsContext';
import { TUTORIALS } from './tutorialConfig';

const TutorialContext = createContext(null);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};

export const TutorialProvider = ({ children }) => {
  const { settings, updateSettings } = useSettings();

  // Initialize tutorial state from UserSettings
  const [tutorialsEnabled, setTutorialsEnabled] = useState(
    settings?.tutorialsEnabled !== false
  );
  const [completedTutorials, setCompletedTutorials] = useState(
    settings?.completedTutorials || []
  );
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Sync with UserSettings when settings change
  useEffect(() => {
    if (settings) {
      setTutorialsEnabled(settings.tutorialsEnabled !== false);
      setCompletedTutorials(settings.completedTutorials || []);
      setIsReady(true);
    }
  }, [settings]);

  // Start a tutorial
  const startTutorial = useCallback((tutorialId) => {
    if (!tutorialsEnabled) return;

    const tutorial = TUTORIALS[tutorialId];
    if (!tutorial) {
      console.warn(`Tutorial ${tutorialId} not found`);
      return;
    }

    setActiveTutorial(tutorial);
    setCurrentStep(0);
  }, [tutorialsEnabled]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (!activeTutorial) return;

    if (currentStep < activeTutorial.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial completed
      completeTutorial();
    }
  }, [activeTutorial, currentStep]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Skip current tutorial
  const skipTutorial = useCallback(() => {
    if (activeTutorial && !completedTutorials.includes(activeTutorial.id)) {
      // If they skip, treat it as "dismissed" so it doesn't infinitely loop
      const newCompleted = [...completedTutorials, activeTutorial.id];
      setCompletedTutorials(newCompleted);
      updateSettings({ completedTutorials: newCompleted });
    }
    setActiveTutorial(null);
    setCurrentStep(0);
  }, [activeTutorial, completedTutorials, updateSettings]);

  // Complete current tutorial
  const completeTutorial = useCallback(() => {
    if (!activeTutorial) return;

    const newCompleted = Array.from(new Set([...completedTutorials, activeTutorial.id]));
    setCompletedTutorials(newCompleted);

    // Persist to UserSettings
    updateSettings({
      completedTutorials: newCompleted,
    });

    setActiveTutorial(null);
    setCurrentStep(0);
  }, [activeTutorial, completedTutorials, updateSettings]);

  // Temporarily dismiss current tutorial (until next app load)
  const dismissTutorial = useCallback(() => {
    setActiveTutorial(null);
    setCurrentStep(0);
  }, []);

  // Check if a tutorial is completed
  const isTutorialCompleted = useCallback((tutorialId) => {
    return completedTutorials.includes(tutorialId);
  }, [completedTutorials]);

  // Reset a specific tutorial
  const resetTutorial = useCallback((tutorialId) => {
    const newCompleted = completedTutorials.filter(id => id !== tutorialId);
    setCompletedTutorials(newCompleted);
    updateSettings({
      completedTutorials: newCompleted,
    });
  }, [completedTutorials, updateSettings]);

  // Reset all tutorials
  const resetAllTutorials = useCallback(() => {
    setCompletedTutorials([]);
    updateSettings({
      completedTutorials: [],
    });
  }, [updateSettings]);

  // Toggle tutorials globally
  const toggleTutorials = useCallback((enabled) => {
    setTutorialsEnabled(enabled);
    updateSettings({
      tutorialsEnabled: enabled,
    });

    // If disabling, close any active tutorial
    if (!enabled) {
      setActiveTutorial(null);
      setCurrentStep(0);
    }
  }, [updateSettings]);

  const value = {
    tutorialsEnabled,
    isReady,
    activeTutorial,
    currentStep,
    completedTutorials,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    dismissTutorial,
    completeTutorial,
    isTutorialCompleted,
    resetTutorial,
    resetAllTutorials,
    toggleTutorials,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};