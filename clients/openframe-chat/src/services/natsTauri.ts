// Tauri-side NATS bridge client.
//
// Owns one Tauri `Channel<NatsEvent>` for the lifetime of the app and fans out
// to React subscribers in JS. The Rust side (`src-tauri/src/nats_bridge.rs`)
// holds the actual NATS WS connection — on a JetStream OrderedConsumer per
// open dialog plus one core NATS subscription for OS notifications.
//
// Events are flushed once per animation frame (rAF coalescing) so a burst of
// chunks from JetStream collapses into a single React update cycle instead of
// one re-render per chunk.

import { Channel, invoke } from '@tauri-apps/api/core';
import { listen, type Event as TauriEvent } from '@tauri-apps/api/event';
import { useEffect, useRef, useState } from 'react';
import { isTauri } from '../utils/runtime';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface NatsStatus {
  state: ConnectionState;
  reconnectCount: number;
}

export interface NatsEvent {
  dialogId: string;
  streamSeq: number;
  payload: Record<string, unknown>;
}

type EventListener = (event: NatsEvent) => void;
type StatusListener = (status: NatsStatus) => void;
type SubscribedListener = (dialogId: string) => void;

function notifyAll<T>(listeners: Set<(value: T) => void>, value: T, label: string): void {
  listeners.forEach(l => {
    try {
      l(value);
    } catch (err) {
      console.error(`[NATS] ${label} listener error:`, err);
    }
  });
}

class NatsBridgeClient {
  private initPromise: Promise<void> | null = null;

  private status: NatsStatus = { state: 'disconnected', reconnectCount: 0 };
  private statusEventSeen = false;
  private statusListeners = new Set<StatusListener>();
  private eventListeners = new Set<EventListener>();
  private subscribedListeners = new Set<SubscribedListener>();

  private pending: NatsEvent[] = [];
  private flushScheduled = false;

  /** Serializes dialog sub/unsub invokes. Tauri runs commands concurrently,
   * so back-to-back unsubscribe+subscribe can execute inverted on the Rust
   * side — the subscribe confirms against the still-live entry, then the
   * unsubscribe destroys it, leaving JS "subscribed" with no consumer. */
  private dialogOps: Promise<void> = Promise.resolve();

  private enqueueDialogOp(op: () => Promise<void>): Promise<void> {
    // Ops swallow their own errors, so the chain never rejects.
    this.dialogOps = this.dialogOps.then(op);
    return this.dialogOps;
  }

  init(): Promise<void> {
    if (!isTauri) {
      return Promise.resolve();
    }
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch(err => {
        // Allow subsequent retries if init fails (e.g. Tauri not yet ready).
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const unlistens: Array<() => void> = [];
    try {
      unlistens.push(
        await listen<NatsStatus>('nats:status', (e: TauriEvent<NatsStatus>) => {
          this.status = e.payload;
          this.statusEventSeen = true;
          notifyAll(this.statusListeners, this.status, 'status');
        }),
      );

      unlistens.push(
        await listen<{ dialogId: string }>('nats:subscribed', (e: TauriEvent<{ dialogId: string }>) => {
          const dialogId = e.payload?.dialogId;
          if (!dialogId) return;
          notifyAll(this.subscribedListeners, dialogId, 'subscribed');
        }),
      );

      try {
        const snapshot = await invoke<NatsStatus>('nats_status');
        // The bridge may have connected long before this webview loaded, so
        // the snapshot must reach listeners too — but never clobber a fresher
        // event-pushed status.
        if (!this.statusEventSeen) {
          this.status = snapshot;
          notifyAll(this.statusListeners, this.status, 'status');
        }
      } catch (err) {
        console.warn('[NATS] initial nats_status invoke failed:', err);
      }

      const channel = new Channel<NatsEvent>();
      channel.onmessage = (event: NatsEvent) => this.receive(event);
      await invoke('nats_register_event_channel', { channel });
    } catch (err) {
      // Tear down so the init retry doesn't register duplicate listeners or
      // skip the status snapshot because of an event seen in the failed run.
      for (const unlisten of unlistens) unlisten();
      this.statusEventSeen = false;
      throw err;
    }
  }

  private receive(event: NatsEvent): void {
    this.pending.push(event);
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    const flush = () => {
      if (!this.flushScheduled) return;
      this.flushScheduled = false;
      const batch = this.pending;
      this.pending = [];
      for (const evt of batch) {
        notifyAll(this.eventListeners, evt, 'event');
      }
    };
    // rAF coalesces a chunk burst into one React update cycle, but it doesn't
    // fire in hidden webviews — pair it with a timer and let whichever runs
    // first do the flush (the guard above makes the second a no-op).
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(flush);
      setTimeout(flush, 250);
    } else {
      setTimeout(flush, 16);
    }
  }

  getStatus(): NatsStatus {
    return this.status;
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  onSubscribed(listener: SubscribedListener): () => void {
    this.subscribedListeners.add(listener);
    return () => {
      this.subscribedListeners.delete(listener);
    };
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    if (!isTauri) return;
    try {
      await this.init();
      await invoke('nats_set_notifications_enabled', { enabled });
    } catch (err) {
      console.warn('[NATS] nats_set_notifications_enabled failed:', err);
    }
  }

  subscribeDialog(dialogId: string, optStartSeq: number | null | undefined): Promise<void> {
    if (!isTauri) return Promise.resolve();
    return this.enqueueDialogOp(async () => {
      try {
        await this.init();
        await invoke('nats_subscribe_dialog', {
          dialogId,
          optStartSeq: typeof optStartSeq === 'number' ? optStartSeq : null,
        });
      } catch (err) {
        console.warn('[NATS] nats_subscribe_dialog failed:', err);
      }
    });
  }

  unsubscribeDialog(dialogId: string): Promise<void> {
    if (!isTauri) return Promise.resolve();
    return this.enqueueDialogOp(async () => {
      try {
        await this.init();
        await invoke('nats_unsubscribe_dialog', { dialogId });
      } catch (err) {
        console.warn('[NATS] nats_unsubscribe_dialog failed:', err);
      }
    });
  }
}

export const natsBridge = new NatsBridgeClient();

/* ----------------------------- React hooks ----------------------------- */

export function useTauriBridgeLiveness(): {
  isConnected: boolean;
  reconnectionCount: number;
} {
  const [status, setStatus] = useState<NatsStatus>(natsBridge.getStatus());

  useEffect(() => {
    if (!isTauri) return;
    natsBridge.init().catch(err => console.warn('[NATS] bridge init failed:', err));
    return natsBridge.onStatus(setStatus);
  }, []);

  return {
    isConnected: status.state === 'connected',
    reconnectionCount: status.reconnectCount,
  };
}

/**
 * Pushes the `notifications` feature-flag value to Rust, which gates OS
 * notification dispatch. Rust defaults to off, so nothing fires until the
 * loaded flag arrives. No-op in Vite-only mode.
 */
export function useNatsNotificationsEnabled(enabled: boolean): void {
  useEffect(() => {
    if (!isTauri) return;
    void natsBridge.setNotificationsEnabled(enabled);
  }, [enabled]);
}

interface UseTauriDialogSubscriptionOpts {
  enabled: boolean;
  dialogId: string | null;
  /** Initial replay seq from the history fetch. Null/undefined = live-tail only. */
  optStartSeq?: number | null;
  onEvent: (chunk: Record<string, unknown> & { streamSeq?: number }) => void;
  onSubscribed?: () => void;
}

/**
 * Wraps the Rust JetStream consumer for one dialog. Mirrors the shape of
 * `useJetStreamDialogSubscription` from openframe-frontend-core so the Vite
 * fallback path in `useChat` can be swapped in/out by a runtime flag.
 */
export function useTauriDialogSubscription({
  enabled,
  dialogId,
  optStartSeq,
  onEvent,
  onSubscribed,
}: UseTauriDialogSubscriptionOpts): {
  isSubscribed: boolean;
} {
  const onEventRef = useRef(onEvent);
  const onSubscribedRef = useRef(onSubscribed);
  onEventRef.current = onEvent;
  onSubscribedRef.current = onSubscribed;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const highestSeqRef = useRef<number | null>(null);
  const optStartSeqRef = useRef(optStartSeq);
  optStartSeqRef.current = optStartSeq;

  // Manage the Rust-side subscription lifecycle. Resets seq tracking on
  // dialog change so a fresh subscription starts with a clean dedup window.
  // optStartSeq is deliberately NOT a dependency: it's only the initial
  // replay floor, and it bumps on every history refetch (e.g. window
  // refocus) — tearing down a live consumer for that loses chunks. Rust
  // resumes from max(initial, last_delivered) + 1 on its own.
  useEffect(() => {
    if (!isTauri || !enabled || !dialogId) {
      // Reset on disable too — a stale `true` would let useChat's
      // waitForNatsSubscription shortcut skip a fresh dialog's confirmation.
      setIsSubscribed(false);
      highestSeqRef.current = null;
      return;
    }
    highestSeqRef.current = null;
    setIsSubscribed(false);
    void natsBridge.subscribeDialog(dialogId, optStartSeqRef.current);
    return () => {
      void natsBridge.unsubscribeDialog(dialogId);
    };
  }, [enabled, dialogId]);

  // Listen for nats:subscribed events filtered by dialogId.
  useEffect(() => {
    if (!isTauri || !enabled || !dialogId) return;
    return natsBridge.onSubscribed(id => {
      if (id === dialogId) {
        setIsSubscribed(true);
        onSubscribedRef.current?.();
      }
    });
  }, [enabled, dialogId]);

  // Pipe channel events through to the consumer, filtered by dialogId.
  useEffect(() => {
    if (!isTauri || !enabled || !dialogId) return;
    return natsBridge.onEvent(evt => {
      if (evt.dialogId !== dialogId) return;
      const seq = evt.streamSeq;
      if (typeof seq === 'number') {
        if (highestSeqRef.current == null || seq > highestSeqRef.current) {
          highestSeqRef.current = seq;
        } else {
          return;
        }
      }
      const chunk = { ...evt.payload, streamSeq: seq };
      onEventRef.current(chunk);
    });
  }, [enabled, dialogId]);

  return { isSubscribed };
}
