import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// CREATED 04-Feb-2026: Reusable Floating Action Button component that accepts an array of buttons
// Usage: <GlobalFAB buttons={[{key: "income", content: <Button>Add Income</Button>}, ...]} />

export default function GlobalFAB({ buttons = [] }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        // <div className="fixed bottom-6 right-4 z-50 flex flex-col-reverse items-end gap-3 pointer-events-none">
        <div className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[110] flex flex-col-reverse items-end gap-3 pointer-events-none">
            {/* Main FAB Toggle Button */}
            <motion.button
                className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto"
                onClick={() => setIsOpen(!isOpen)}
                whileTap={{ scale: 0.9 }}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
            >
                <Plus className="w-6 h-6" />
            </motion.button>

            {/* Expandable Button List */}
            <AnimatePresence>
                {isOpen && (
                    <div className="flex flex-col-reverse items-end gap-3 w-max max-w-[calc(100vw-2rem)] pointer-events-auto">
                        {buttons.map((button, index) => (
                            <motion.div
                                key={button.key || index}
                                initial={{ scale: 0, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0, y: 20 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                className="flex items-center"
                                onClick={() => setIsOpen(false)}
                            >
                                {button.content}
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}