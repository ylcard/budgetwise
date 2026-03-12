import { memo, useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ScrollToTopButton
 * A floating button that appears when the user scrolls down inside a scrollable container.
 * Scrolls the container back to the top smoothly when clicked.
 *
 * @param {React.RefObject} scrollRef - Ref to the scrollable container element
 * @param {number} [threshold=80] - Scroll distance (px) before the button appears
 */
const ScrollToTopButton = memo(function ScrollToTopButton({ scrollRef, threshold = 80 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const handleScroll = () => {
      setVisible(el.scrollTop > threshold);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef, threshold]);

  const scrollToTop = useCallback(() => {
    const el = scrollRef?.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollRef]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={scrollToTop}
          className="fixed left-1/2 -translate-x-1/2 z-30 w-10 h-10 rounded-full bg-white/60 dark:bg-card/60 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          style={{ bottom: "calc(var(--nav-total-height) + 2px)" }}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

export default ScrollToTopButton;