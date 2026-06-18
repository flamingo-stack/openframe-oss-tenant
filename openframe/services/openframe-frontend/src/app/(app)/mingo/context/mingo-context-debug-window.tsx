'use client';

/**
 * Mingo context dev window — a floating, draggable debug panel that surfaces
 * the live `openView` and `recentViews` from the navigation-context store (the
 * values carried on every Mingo message). Lets you eyeball what the agent will
 * receive and clear the recents while testing.
 *
 * Visibility is opt-in via a console command — hidden by default in every env:
 *
 *   mingoDebug()       // toggle on/off
 *   mingoDebug(true)   // force on
 *   mingoDebug(false)  // force off
 *
 * The choice persists in `localStorage 'mingo-context-debug'` ('1' on / '0'
 * off). Hidden by default in every env until explicitly turned on. The panel
 * position is remembered in `localStorage 'mingo-context-debug-pos'`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMingoContextStore } from '../stores/mingo-context-store';
import type { ContextRefWithLabel } from './context-types';

const DEBUG_FLAG_KEY = 'mingo-context-debug';
const DEBUG_POS_KEY = 'mingo-context-debug-pos';
// Pointer travel (px) past which a header press counts as a drag, not a click.
const DRAG_THRESHOLD = 4;

declare global {
  interface Window {
    mingoDebug?: (next?: boolean) => boolean;
  }
}

function resolveEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Hidden by default in every env — only the explicit console opt-in shows it.
  return window.localStorage.getItem(DEBUG_FLAG_KEY) === '1';
}

function useDebugEnabled(): boolean {
  // Resolve on the client only (localStorage + env), after mount, to avoid an
  // SSR/CSR mismatch.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(resolveEnabled());

    // Expose a console command so the panel can be summoned in any env.
    const mingoDebug = (next?: boolean): boolean => {
      const value = typeof next === 'boolean' ? next : !resolveEnabled();
      window.localStorage.setItem(DEBUG_FLAG_KEY, value ? '1' : '0');
      setEnabled(value);
      console.info(`[mingo] context debug panel ${value ? 'ON' : 'OFF'}`);
      return value;
    };
    window.mingoDebug = mingoDebug;

    // Keep multiple tabs / instances in sync when the flag changes.
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEBUG_FLAG_KEY) setEnabled(resolveEnabled());
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (window.mingoDebug === mingoDebug) window.mingoDebug = undefined;
    };
  }, []);
  return enabled;
}

type Position = { x: number; y: number };

function readStoredPosition(): Position | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEBUG_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // ignore malformed value
  }
  return null;
}

export function MingoContextDebugWindow() {
  const enabled = useDebugEnabled();
  const [collapsed, setCollapsed] = useState(true);
  const [position, setPosition] = useState<Position | null>(null);
  const openView = useMingoContextStore(s => s.openView);
  const recentViews = useMingoContextStore(s => s.recentViews);
  const clearOpenView = useMingoContextStore(s => s.clearOpenView);
  const clearRecentViews = useMingoContextStore(s => s.clearRecentViews);

  // Restore the saved position once on mount (client-only).
  useEffect(() => {
    setPosition(readStoredPosition());
  }, []);

  // Drag state lives in a ref so pointer-move handlers don't re-render per frame.
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  const draggedRef = useRef(false);

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    draggedRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    // Ignore jitter until the pointer travels past the threshold, so a normal
    // click still toggles the panel instead of nudging it.
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD) {
      return;
    }
    drag.moved = true;
    draggedRef.current = true;
    // Clamp inside the viewport so the panel can't be dragged off-screen.
    const maxX = window.innerWidth - 120;
    const maxY = window.innerHeight - 40;
    setPosition({
      x: Math.max(0, Math.min(e.clientX - drag.offsetX, maxX)),
      y: Math.max(0, Math.min(e.clientY - drag.offsetY, maxY)),
    });
  }, []);

  const onHeaderPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (drag.moved) {
      setPosition(prev => {
        if (prev) window.localStorage.setItem(DEBUG_POS_KEY, JSON.stringify(prev));
        return prev;
      });
    }
  }, []);

  const onHeaderClick = useCallback(() => {
    // Suppress the collapse toggle if this press was actually a drag.
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setCollapsed(v => !v);
  }, []);

  if (!enabled) return null;

  const positioned = position !== null;

  return (
    <div
      className="fixed z-[9999] w-[320px] select-none rounded-md border border-ods-border bg-ods-card text-ods-text-primary shadow-lg"
      style={positioned ? { left: position.x, top: position.y } : { left: 12, bottom: 12 }}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onClick={onHeaderClick}
        className="flex w-full cursor-grab items-center justify-between gap-2 px-3 py-2 text-left text-h5 font-medium outline-none active:cursor-grabbing"
      >
        <span>Mingo context · debug</span>
        <span className="text-ods-text-secondary">{collapsed ? '▸' : '▾'}</span>
      </div>

      {!collapsed && (
        <div className="max-h-[50vh] overflow-y-auto border-t border-ods-border px-3 py-2 text-h5">
          <Section title="openView">
            {openView ? <RefRow refItem={openView} /> : <p className="text-ods-text-muted">— none —</p>}
          </Section>

          <Section
            title={`recentViews (${recentViews.length}/5)`}
            action={recentViews.length > 0 ? { label: 'Clear', onClick: clearRecentViews } : undefined}
          >
            {recentViews.length === 0 ? (
              <p className="text-ods-text-muted">— empty —</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {recentViews.map(r => (
                  <li key={`${r.type}:${r.id}`}>
                    <RefRow refItem={r} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {openView && (
            <button
              type="button"
              // Call with no arg — `clearOpenView(ref?)` treats a passed ref as
              // a guard key; handing it the click event would no-op the button.
              onClick={() => clearOpenView()}
              className="mt-2 rounded border border-ods-border px-2 py-1 text-h5 text-ods-text-secondary hover:text-ods-text-primary"
            >
              Roll openView → recent
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-ods-text-secondary">{title}</span>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-ods-text-muted hover:text-ods-attention-red-error"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RefRow({ refItem }: { refItem: ContextRefWithLabel }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 rounded bg-ods-bg px-1 font-mono text-xs uppercase text-ods-text-secondary">
        {refItem.type}
      </span>
      <span className="truncate" title={`${refItem.label} (${refItem.id})`}>
        {refItem.label}
      </span>
      <span className="ml-auto shrink-0 font-mono text-xs text-ods-text-muted">{refItem.id}</span>
    </div>
  );
}
