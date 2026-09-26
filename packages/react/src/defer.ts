import { useEffect, type RefObject } from "react";

export function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

/**
 * Applies `want` when it's safe: immediately if the element is off screen, when it scrolls out of view, or on the
 * next navigation. Never swaps content the visitor is looking at.
 */
export function useDeferredApply<T>(ref: RefObject<Element | null>, want: T, shown: T, pathname: string, apply: (next: T) => void): void {
  useEffect(() => {
    if (Object.is(want, shown)) return;
    const el = ref.current;
    if (!el || !inViewport(el)) {
      apply(want);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) {
        io.disconnect();
        apply(want);
      }
    });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want, shown]);

  // A navigation means the visitor isn't looking at the old content any more.
  useEffect(() => {
    if (!Object.is(want, shown)) apply(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}
