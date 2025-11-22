import { motion, AnimatePresence } from "framer-motion";

/**
 * Reusable motion component for elements that appear/disappear
 * Used for create/destroy animations
 * 
 * @param {boolean} show - Controls visibility
 * @param {object} initial - Initial animation state (default: { opacity: 0, height: 0 })
 * @param {object} animate - Animate to state (default: { opacity: 1, height: "auto" })
 * @param {object} exit - Exit animation state (default: { opacity: 0, height: 0 })
 * @param {number} duration - Animation duration in seconds (default: 0.2)
 * @param {ReactNode} children - Content to animate
 */
export default function AnimatePresenceContainer({
    show = true,
    initial = { opacity: 0, height: 0 },
    animate = { opacity: 1, height: "auto" },
    exit = { opacity: 0, height: 0 },
    duration = 0.2,
    children,
    ...props
}) {
    return (
        <AnimatePresence mode="wait">
            {show && (
                <motion.div
                    initial={initial}
                    animate={animate}
                    exit={exit}
                    transition={{ duration }}
                    {...props}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
