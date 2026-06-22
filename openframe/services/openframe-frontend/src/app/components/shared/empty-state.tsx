'use client';

import { NoData, type NoDataProps } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useEffect, useRef, useState } from 'react';

export type EmptyStateProps = NoDataProps;

/**
 * App-wide empty state: centers `NoData`, filling the area down to the bottom of
 * the scroll container (`<main>`) with a `60vh` floor. The fill height is
 * measured because it can't propagate down the nested page layouts via CSS.
 */
export function EmptyState(props: EmptyStateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [fillHeight, setFillHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Nearest scroll container; falls back to the viewport outside the app shell.
    const scroller = el.closest('main');

    // The page's outermost wrapper - the direct child of the scroll container.
    let pageRoot: HTMLElement = el;
    while (pageRoot.parentElement && pageRoot.parentElement !== scroller) {
      pageRoot = pageRoot.parentElement;
    }

    const recompute = () => {
      const contentBottom = scroller
        ? scroller.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(scroller).paddingBottom) || 0)
        : window.innerHeight;
      const freeSpace = contentBottom - pageRoot.getBoundingClientRect().bottom;
      const next = Math.round(el.offsetHeight + freeSpace);
      setFillHeight(prev => (prev != null && Math.abs(prev - next) <= 1 ? prev : next));
    };

    recompute();

    const observer = new ResizeObserver(recompute);
    if (scroller) observer.observe(scroller);
    observer.observe(pageRoot);
    window.addEventListener('resize', recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="flex min-h-[60vh] w-full items-center justify-center"
      style={fillHeight != null ? { minHeight: `max(60vh, ${fillHeight}px)` } : undefined}
    >
      <NoData {...props} />
    </div>
  );
}
