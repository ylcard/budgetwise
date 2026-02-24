import { useState, useEffect } from "react";
import { Plus, FileUp, MinusCircle, PlusCircle, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFAB } from "../hooks/FABContext";
import { CustomButton } from "./CustomButton";

// UPDATED 04-Feb-2026: Now accepts button configs with onClick handlers instead of full components
// This prevents dialog state from being coupled to FAB open/close state

const iconMap = {
  FileUp,
  MinusCircle,
  PlusCircle,
  Play,
  Plus
};

export default function GlobalFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const { buttons } = useFAB();

  useEffect(() => setIsOpen(false), [buttons]);

  if (!buttons || buttons.length === 0) return null;

  const handleButtonClick = (onClick) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[40] flex flex-col-reverse items-end gap-3 pointer-events-none">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        data-tutorial="add-fab"
        className="pointer-events-auto w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        whileTap={{ scale: 0.95 }}
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col-reverse gap-2 pointer-events-auto"
          >
            {buttons.map((button) => {
              const Icon = iconMap[button.icon];
              return (
                <motion.div
                  key={button.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: 0.05 }}
                  className={button.highlighted ? "relative" : ""}
                >
                  {button.highlighted && (
                    <div className="absolute -inset-2 bg-[hsl(var(--stat-income-bg))] rounded-lg blur-md animate-pulse"></div>
                  )}
                  <CustomButton
                    variant={button.variant}
                    size="sm"
                    onClick={() => handleButtonClick(button.onClick)}
                    disabled={button.disabled}
                    className="w-full justify-start relative"
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {button.label}
                  </CustomButton>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}