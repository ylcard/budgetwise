import { memo, useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ScrollToTopButton
 * A floating button that appears when the user scrolls down inside a scrollable container.
 * Scrolls the container back to the top smoothly when clicked.
 *
 * @param {React.RefObject} [scrollRef] - Ref to the scrollable container element.
 *   If omitted, the component auto-detects the Layout's main scrollable wrapper.
 * @param {number} [threshold=80] - Scroll distance (px) before the button appears
 */
const ScrollToTopButton = memo(function ScrollToTopButton({ scrollRef, threshold = 80 }) {
  const [visible, setVisible] = useState(false);

  // Resolve the scrollable element: explicit ref > Layout's main scroller
  const getScrollElement = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current;
    // Layout's main content wrapper — the first child of <main> with overflow-auto
    return document.querySelector('main .overflow-auto') || null;
  }, [scrollRef]);

  useEffect(() => {
    const el = getScrollElement();
    if (!el) return;

    const handleScroll = () => {
      setVisible(el.scrollTop > threshold);
    };

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