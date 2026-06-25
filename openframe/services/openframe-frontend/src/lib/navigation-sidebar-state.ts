/**
 * Shared constants for the navigation sidebar's persisted collapse state.
 *
 * These mirror the core `NavigationSidebar` (whose width/storage constants are
 * module-local and not exported). This module is intentionally framework
 * -neutral (no `'use client'`) so both the client `AppShellSkeleton` and the
 * server root layout can import it.
 */

export const SIDEBAR_MINIMIZED_WIDTH = 56;
export const SIDEBAR_EXPANDED_WIDTH = 224;
export const SIDEBAR_MINIMIZED_STORAGE_KEY = 'of.navigationSidebar.minimized';

/**
 * CSS variable seeded before first paint (by {@link sidebarWidthFoucScript}) so
 * the SSR'd skeleton sidebar renders at the persisted width. `localStorage` is
 * unreadable on the server, so without this the sidebar flashes expanded →
 * minimized on every refresh.
 */
export const SIDEBAR_WIDTH_CSS_VAR = '--of-sidebar-skeleton-width';

/**
 * Assembled through a tagged template so the value is built at runtime. A plain
 * concatenation or constant template literal gets constant-folded by Turbopack's
 * SWC minifier, which mis-folds this particular string and silently drops the
 * `getItem` comparison and the `matchMedia` line — corrupting the emitted
 * inline script. The tag call blocks that fold.
 */
const runtimeJoin = (parts: TemplateStringsArray, ...values: Array<string | number>): string =>
  parts.reduce<string>((acc, part, i) => acc + part + (i < values.length ? values[i] : ''), '');

/**
 * Inline FOUC-prevention script. Runs synchronously in `<head>` before first
 * paint: reads the persisted (or tablet-forced) collapse state and seeds the
 * width CSS var. Breakpoints mirror the core sidebar hooks (md 800px, lg
 * 1280px); tablet always starts minimized.
 */
export const sidebarWidthFoucScript = runtimeJoin`(function(){try{var m=localStorage.getItem('${SIDEBAR_MINIMIZED_STORAGE_KEY}')==='true';if(window.matchMedia('(min-width:800px)').matches&&!window.matchMedia('(min-width:1280px)').matches)m=true;document.documentElement.style.setProperty('${SIDEBAR_WIDTH_CSS_VAR}',m?'${SIDEBAR_MINIMIZED_WIDTH}px':'${SIDEBAR_EXPANDED_WIDTH}px');}catch(e){}})();`;
