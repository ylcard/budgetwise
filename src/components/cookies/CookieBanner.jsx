import { motion, AnimatePresence } from 'framer-motion';
import { CustomButton } from '@/components/ui/CustomButton';
import { Cookie, Settings } from 'lucide-react';

export default function CookieBanner({ show, onAcceptAll, onAcceptNecessary, onOpenSettings }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <div className="pointer-events-auto px-4 pb-4 md:px-6 md:pb-6">
                        <div className="max-w-6xl mx-auto bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Gradient accent top border */}
                            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                            
                            <div className="p-6 md:p-8">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                                <Cookie className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">Cookie Preferences</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            We use cookies to enhance your experience, analyze site traffic, and deliver personalized content. 
                                            Choose your preferences or accept all to continue.
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row gap-3 md:flex-shrink-0 md:w-auto w-full">
                                        {/* Settings Link */}
                                        <CustomButton
                                            variant="ghost"
                                            onClick={onOpenSettings}
                                            className="order-3 sm:order-1 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Settings className="w-4 h-4 mr-2" />
                                            Settings
                                        </CustomButton>

                                        {/* Only Necessary */}
                                        <CustomButton
                                            variant="outline"
                                            onClick={onAcceptNecessary}
                                            className="order-2 border-2 hover:bg-accent"
                                        >
                                            Only Necessary
                                        </CustomButton>

                                        {/* Accept All */}
                                        <CustomButton
                                            variant="primary"
                                            onClick={onAcceptAll}
                                            className="order-1 sm:order-3 shadow-lg"
                                        >
                                            Accept All
                                        </CustomButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}