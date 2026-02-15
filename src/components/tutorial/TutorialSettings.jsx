/**
 * @fileoverview Tutorial Settings Component
 * CREATED: 15-Feb-2026
 * 
 * UI for managing tutorial preferences:
 * - Enable/disable all tutorials
 * - View completed tutorials
 * - Reset individual or all tutorials
 */

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CustomButton } from '../ui/CustomButton';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useTutorial } from './TutorialContext';
import { getTutorialList } from './tutorialConfig';
import { GraduationCap, RotateCcw, Play, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const TutorialSettings = memo(() => {
    const {
        tutorialsEnabled,
        completedTutorials,
        toggleTutorials,
        startTutorial,
        resetTutorial,
        resetAllTutorials,
    } = useTutorial();

    const tutorials = getTutorialList();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-500" />
                    <CardTitle>Onboarding Tutorials</CardTitle>
                </div>
                <CardDescription>
                    Learn how to use different features with guided walkthroughs
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Global enable/disable */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="space-y-1">
                        <Label htmlFor="tutorials-enabled" className="text-base font-medium">
                            Enable Tutorials
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Show guided walkthroughs for new features
                        </p>
                    </div>
                    <Switch
                        id="tutorials-enabled"
                        checked={tutorialsEnabled}
                        onCheckedChange={toggleTutorials}
                    />
                </div>

                {/* Tutorial list */}
                {tutorialsEnabled && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                Available Tutorials
                            </h3>
                            {completedTutorials.length > 0 && (
                                <CustomButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetAllTutorials}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Reset All
                                </CustomButton>
                            )}
                        </div>

                        <div className="space-y-2">
                            {tutorials.map((tutorial) => {
                                const isCompleted = completedTutorials.includes(tutorial.id);

                                return (
                                    <div
                                        key={tutorial.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 border rounded-lg transition-colors",
                                            isCompleted
                                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                                        )}
                                    >
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {tutorial.title}
                                                </h4>
                                                {isCompleted && (
                                                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                        <Check className="w-3 h-3" />
                                                        Completed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {tutorial.description}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                {tutorial.steps.length} steps
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isCompleted && (
                                                <CustomButton
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => resetTutorial(tutorial.id)}
                                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                    title="Reset tutorial"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </CustomButton>
                                            )}
                                            <CustomButton
                                                variant={isCompleted ? "outline" : "primary"}
                                                size="sm"
                                                onClick={() => startTutorial(tutorial.id)}
                                            >
                                                <Play className="w-4 h-4 mr-1" />
                                                {isCompleted ? 'Replay' : 'Start'}
                                            </CustomButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!tutorialsEnabled && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                            Tutorials are currently disabled.
                            <br />
                            Enable them above to access guided walkthroughs.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

TutorialSettings.displayName = 'TutorialSettings';

export default TutorialSettings;