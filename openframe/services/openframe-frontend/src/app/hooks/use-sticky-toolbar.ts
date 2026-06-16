'use client';

import { type CSSProperties, type RefObject, useEffect, useRef, useState } from 'react';

interface StickyToolbar {
  /** Attach to the sticky toolbar element whose height drives the table-header offset. */
  toolbarRef: RefObject<HTMLDivElement | null>;
  /** Apply to the element wrapping both the toolbar and the table; publishes the measured height. */
  containerStyle: CSSProperties;
  /** Pass to DataTable.Header's `stickyHeaderOffset` so it pins right below the toolbar. */
  stickyHeaderOffset: string;
}

/**
 * Keeps a sticky filter toolbar pinned above a sticky table header. The toolbar
 * height is measured (it changes as the single-row tag list appears or collapses)
 * and published as `--sticky-toolbar-h` on the container, which the table header
 * reads via `top-[var(--sticky-toolbar-h)]` — so the header always pins flush
 * below the toolbar without a hard-coded offset.
 */
export function useStickyToolbar(): StickyToolbar {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    toolbarRef,
    containerStyle: { '--sticky-toolbar-h': `${height}px` } as CSSProperties,
    stickyHeaderOffset: 'top-[var(--sticky-toolbar-h)]',
  };
}
