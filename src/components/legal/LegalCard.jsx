/**
 * LegalCard — Mobile-optimised Card primitives for legal/policy pages.
 * ADDED 12-Mar-2026
 *
 * Reduces padding, font sizes, and list indentation on mobile while
 * keeping the standard shadcn Card aesthetic on desktop.
 */
import { cn } from "@/lib/utils";

export function LegalCard({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow",
        className
      )}
      {...props}
    />
  );
}

export function LegalCardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col space-y-1 p-3 pb-2 md:p-6 md:pb-4", className)}
      {...props}
    />
  );
}

export function LegalCardTitle({ className, ...props }) {
  return (
    <div
      className={cn(
        "font-semibold leading-none tracking-tight text-sm md:text-base",
        className
      )}
      {...props}
    />
  );
}

export function LegalCardContent({ className, ...props }) {
  return (
    <div
      className={cn(
        "p-3 pt-0 md:p-6 md:pt-0",
        /* Tighten list indentation on mobile */
        "[&_ul]:pl-4 [&_ul]:md:pl-6",
        /* Slightly smaller body text on mobile */
        "[&_p]:text-xs [&_p]:md:text-sm",
        "[&_li]:text-xs [&_li]:md:text-sm",
        /* Tighter border-l sections on mobile */
        "[&_.border-l-4]:pl-3 [&_.border-l-4]:md:pl-4",
        className
      )}
      {...props}
    />
  );
}