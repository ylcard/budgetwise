import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * CREATED: 03-Feb-2026
 * RouteTransition - Provides iOS-style slide transitions between routes
 * Usage: Wrap your page content with this component in Layout
 */

const pageVariants = {
    initial: {
        opacity: 0,
        x: 20,
    },
    in: {
        opacity: 1,
        x: 0,
    },
    out: {
        opacity: 0,
        x: -20,
    },
};

const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3,
};

export function RouteTransition({ children }) {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={location.pathname}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}