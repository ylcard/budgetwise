import { memo, useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ScrollToTopButton
 * A floating button that appears when the user scrolls down inside a scrollable container.
 * Scrolls the container back to the top smoothly when clicked.
 *
 * @param {React.RefObject} [scrollRef] - Ref to the scrollable container element.
 *   If omitted, the component auto-detects the Layout's main scrollable wrapper via DOM query.
 * @param {number} [threshold=80] - Scroll distance (px) before the button appears
 */
const ScrollToTopButton = memo(function ScrollToTopButton({ scrollRef, threshold = 80 }) {
  const [visible, setVisible] = useState(false);
  // ADDED 12-Mar-2026: Track the resolved element in state so we can re-attach
  // the listener when the ref becomes available (fixes timing with Layout mount).
  const [scrollEl, setScrollEl] = useState(null);

  // Resolve the scrollable element once the ref is populated or DOM is ready
  useEffect(() => {
    const resolve = () => {
      if (scrollRef?.current) return scrollRef.current;
      return document.querySelector('main .overflow-auto') || null;
    };

    const el = resolve();
    if (el) {
      setScrollEl(el);
    } else {
      // Ref may not be populated on first render — retry after a short delay
      const timer = setTimeout(() => setScrollEl(resolve()), 100);
      return () => clearTimeout(timer);
    }
  }, [scrollRef]);

  // Attach scroll listener to the resolved element
  useEffect(() => {
    if (!scrollEl) return;

    const handleScroll = () => {
      setVisible(scrollEl.scrollTop > threshold);
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [scrollEl, threshold]);

  const scrollToTop = useCallback(() => {
    if (!scrollEl) return;
    scrollEl.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollEl]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={scrollToTop}
          className="fixed inset-x-0 mx-auto z-30 w-10 h-10 rounded-full bg-white/40 dark:bg-card/40 backdrop-blur-md border border-border/40 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          style={{ bottom: "calc(var(--nav-total-height) - 50px)" }}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

export default ScrollToTopButton;