'use client';

/**
 * Mingo navigation-context store — tracks the entity the user is currently
 * viewing (`openView`) and the up-to-5 entities they viewed before it
 * (`recentViews`). Both ride out on every Mingo message so the agent has the
 * user's working context (POST /chat/api/v1/messages → `openView` /
 * `recentViews`, see `mingo-api-service.ts`).
 *
 * `openView` is set by `useTrackOpenView` from each entity detail page and
 * cleared on unmount; when an open view is replaced or cleared it rolls into
 * `recentViews` (deduped by `type:id`, most-recent-first, capped at
 * `RECENT_VIEWS_MAX`). Persisted to localStorage so the working context
 * survives reloads.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { type ContextRefWithLabel, RECENT_VIEWS_MAX } from '../context/context-types';

const refKey = (r: { type: string; id: string }) => `${r.type}:${r.id}`;

/** Prepend `ref` to `recents`, drop any existing duplicate, cap the length. */
function rollIntoRecents(recents: ContextRefWithLabel[], ref: ContextRefWithLabel): ContextRefWithLabel[] {
  const key = refKey(ref);
  const withoutDup = recents.filter(r => refKey(r) !== key);
  return [ref, ...withoutDup].slice(0, RECENT_VIEWS_MAX);
}

interface MingoContextState {
  openView: ContextRefWithLabel | null;
  recentViews: ContextRefWithLabel[];
  /** Set the currently-open entity. Rolls the previous open view (if any and
   *  different) into `recentViews`. */
  setOpenView: (ref: ContextRefWithLabel) => void;
  /** Clear the open view (e.g. navigating to a non-entity page), rolling it
   *  into `recentViews`. Idempotent when already null. Pass the `{ type, id }`
   *  the caller set so a stale unmount-cleanup can't clobber a newer open view
   *  that a just-mounted page already set (navigation ordering race). */
  clearOpenView: (ref?: { type: string; id: string }) => void;
  /** Wipe recent views (dev-window debug action). */
  clearRecentViews: () => void;
}

export const useMingoContextStore = create<MingoContextState>()(
  devtools(
    persist(
      (set, get) => ({
        openView: null,
        recentViews: [],

        setOpenView: ref => {
          const { openView, recentViews } = get();
          if (openView && refKey(openView) === refKey(ref)) {
            // Re-opening the same entity: just refresh its label/desc.
            set({ openView: ref }, false, 'setOpenView/refresh');
            return;
          }
          set(
            {
              openView: ref,
              // Previous open view becomes recent; the newly-open entity is
              // removed from recents (it's "open", not "recent").
              recentViews: (openView ? rollIntoRecents(recentViews, openView) : recentViews).filter(
                r => refKey(r) !== refKey(ref),
              ),
            },
            false,
            'setOpenView',
          );
        },

        clearOpenView: ref => {
          const { openView, recentViews } = get();
          if (!openView) return;
          // Guard against the navigation race: if a newer page already set a
          // different open view, our stale cleanup must not null it out.
          if (ref && refKey(openView) !== refKey(ref)) return;
          set({ openView: null, recentViews: rollIntoRecents(recentViews, openView) }, false, 'clearOpenView');
        },

        clearRecentViews: () => set({ recentViews: [] }, false, 'clearRecentViews'),
      }),
      {
        name: 'mingo-context-store',
        // Persist ONLY `recentViews`. `openView` must not survive a reload: it
        // means "the entity whose detail page is mounted right now", and after
        // a reload no detail page is mounted to re-assert or clear it — a
        // persisted value would ride out on messages as a phantom current view.
        partialize: state => ({ recentViews: state.recentViews }),
      },
    ),
    { name: 'mingo-context-store' },
  ),
);

/**
 * Wipe the user's Mingo working context — the currently-open view AND the
 * persisted `recentViews`. Call on logout: this context (entity refs with
 * human labels — device names, ticket titles, customer names) rides out on
 * every Mingo message, so leaving it in localStorage would leak one user's
 * working context into the NEXT session on a shared browser.
 *
 * Resets in-memory state too (not just `persist.clearStorage()`) because not
 * every logout path triggers a full reload — e.g. `forceLogout` in SaaS-tenant
 * mode returns without redirecting, so the live store must be cleared directly.
 */
export function clearMingoContext(): void {
  useMingoContextStore.setState({ openView: null, recentViews: [] });
  useMingoContextStore.persist.clearStorage();
}
