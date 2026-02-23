import { useState, useEffect } from 'react';
import { useSettings } from '@/components/utils/SettingsContext';
import { Sun, Moon, Monitor, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const MODES = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
];

export default function AppearanceSettings() {
    const { settings, updateSettings } = useSettings();
    
    // Defensive fallback in case settings or themeConfig isn't fully loaded
    const themeConfig = settings?.themeConfig || { mode: 'system', lightStart: '08:00', darkStart: '20:00' };

    const handleModeChange = async (newMode) => {
        if (themeConfig.mode === newMode) return;
        
        await updateSettings({
            themeConfig: {
                ...themeConfig,
                mode: newMode
            }
        });
    };

    const handleTimeChange = async (field, value) => {
        await updateSettings({
            themeConfig: {
                ...themeConfig,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-foreground mb-1">Appearance</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Customize how BudgetWise looks on this device.
                </p>

                <div className="grid grid-cols-2 gap-3">
                    {MODES.map(({ id, label, icon: Icon }) => {
                        const isActive = themeConfig.mode === id;
                        
                        return (
                            <button
                                key={id}
                                onClick={() => handleModeChange(id)}
                                className={twMerge(
                                    clsx(
                                        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors",
                                        isActive 
                                            ? "border-primary bg-primary/5 text-primary" 
                                            : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    )
                                )}
                            >
                                <Icon className="w-6 h-6 mb-2" />
                                <span className="text-sm font-medium">{label}</span>
                                
                                {isActive && (
                                    <motion.div
                                        layoutId="active-mode-indicator"
                                        className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <AnimatePresence>
                {themeConfig.mode === 'scheduled' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 pt-2">
                            {/* Light Mode Start */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500">
                                        <Sun className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-medium text-foreground">Light Theme</span>
                                        <span className="text-xs text-muted-foreground">Turns on at</span>
                                    </div>
                                </div>
                                <input
                                    type="time"
                                    value={themeConfig.lightStart}
                                    onChange={(e) => handleTimeChange('lightStart', e.target.value)}
                                    className="bg-transparent border-none outline-none text-foreground font-medium text-right focus:ring-0 min-w-[80px]"
                                />
                            </div>

                            {/* Dark Mode Start */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        <Moon className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-medium text-foreground">Dark Theme</span>
                                        <span className="text-xs text-muted-foreground">Turns on at</span>
                                    </div>
                                </div>
                                <input
                                    type="time"
                                    value={themeConfig.darkStart}
                                    onChange={(e) => handleTimeChange('darkStart', e.target.value)}
                                    className="bg-transparent border-none outline-none text-foreground font-medium text-right focus:ring-0 min-w-[80px]"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
