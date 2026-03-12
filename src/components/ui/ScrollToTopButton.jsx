import { memo, useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ScrollToTopButton
 * UPDATED 12-Mar-2026: Per-page integration approach.
 *
 * Usage:
 * 1. With explicit ref (e.g. Reports inner tabs): <ScrollToTopButton scrollRef={myRef} />
 * 2. Without ref (auto-detects Layout's [data-scroll-main] wrapper): <ScrollToTopButton />
 *
 * @param {React.RefObject} [scrollRef] - Optional ref to a specific scrollable container.
 * @param {number} [threshold=80] - Scroll distance (px) before the button appears
 */
const ScrollToTopButton = memo(function ScrollToTopButton({ scrollRef, threshold = 80 }) {
  const [visible, setVisible] = useState(false);

  // Resolve the scrollable element: explicit ref > Layout's data-scroll-main
  const getScrollElement = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current;
    return document.querySelector('[data-scroll-main]') || null;
  }, [scrollRef]);

  // Attach scroll listener
  useEffect(() => {
    // Small delay to ensure DOM is ready (Layout mounts before page content)
    const timerId = setTimeout(() => {
      const el = getScrollElement();
      if (!el) return;

      const handleScroll = () => {
        setVisible(el.scrollTop > threshold);
      };

      // Check initial scroll position
      handleScroll();

      el.addEventListener("scroll", handleScroll, { passive: true });

      // Store cleanup ref for the timeout-deferred listener
      cleanupRef.current = () => el.removeEventListener("scroll", handleScroll);
    }, 50);

    // Mutable ref to hold inner cleanup
    const cleanupRef = { current: null };

    return () => {
      clearTimeout(timerId);
      cleanupRef.current?.();
    };
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