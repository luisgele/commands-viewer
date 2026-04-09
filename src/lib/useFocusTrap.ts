import { useEffect, useRef } from "react";

/**
 * Focus trap hook for modal dialogs.
 *
 * - Saves the currently focused element on mount and restores it on unmount.
 * - Moves focus into the modal (first focusable element or the container itself).
 * - Intercepts Tab / Shift+Tab to cycle focus within the modal only.
 *
 * Usage:
 *   const ref = useFocusTrap<HTMLDivElement>(isOpen);
 *   return <div ref={ref}>...</div>;
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      const selector = [
        'a[href]:not([tabindex="-1"])',
        'button:not([disabled]):not([tabindex="-1"])',
        'input:not([disabled]):not([tabindex="-1"])',
        'select:not([disabled]):not([tabindex="-1"])',
        'textarea:not([disabled]):not([tabindex="-1"])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(",");
      return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );
    };

    // Move focus into the container if it's not already there.
    if (!container.contains(document.activeElement)) {
      const focusables = getFocusable();
      const target = focusables[0] ?? container;
      if (target === container) {
        container.setAttribute("tabindex", "-1");
      }
      target.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to the element that was focused before the modal opened.
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        try {
          previouslyFocused.focus();
        } catch {
          // element may have been removed from the DOM — ignore
        }
      }
    };
  }, [active]);

  return containerRef;
}
