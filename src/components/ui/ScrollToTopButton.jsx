import { memo, useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ScrollToTopButton
 * UPDATED 12-Mar-2026: Replaced ref-based approach with DOM attribute query.
 * When no scrollRef is passed, auto-detects the Layout's main scroll container
 * via [data-scroll-main] attribute — eliminates ref timing issues entirely.
 *
 * @param {React.RefObject} [scrollRef] - Optional ref to a specific scrollable container (e.g. Reports tabs).
 *   If omitted, queries the DOM for [data-scroll-main].
 * @param {number} [threshold=80] - Scroll distance (px) before the button appears
 */
const ScrollToTopButton = memo(function ScrollToTopButton({ scrollRef, threshold = 80 }) {
  const [visible, setVisible] = useState(false);

  // Resolve the scrollable element: explicit ref > data-attribute query
  const getScrollElement = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current;
    return document.querySelector('[data-scroll-main]') || null;
  }, [scrollRef]);

  // Attach scroll listener — re-runs when scrollRef identity changes
  useEffect(() => {
    const el = getScrollElement();
    if (!el) return;

    const handleScroll = () => {
      setVisible(el.scrollTop > threshold);
    };

    // Check initial position (page may already be scrolled on mount)
    handleScroll();

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [getScrollElement, threshold]);

  const scrollToTop = useCallback(() => {
    const el = getScrollElement();
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, [getScrollElement]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={scrollToTop}
          className="fixed inset-x-0 mx-auto z-50 w-10 h-10 rounded-full bg-white/40 dark:bg-card/40 backdrop-blur-md border border-border/40 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          style={{ bottom: "calc(var(--nav-total-height) + 12px)" }}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

export default ScrollToTopButton;