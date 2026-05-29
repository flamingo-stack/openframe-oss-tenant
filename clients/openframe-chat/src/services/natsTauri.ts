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
  reconnect_count: number;
}

export interface NatsEvent {
  dialogId: string;
  streamSeq: number;
  payload: Record<string, unknown>;
}

type EventListener = (event: NatsEvent) => void;
type StatusListener = (status: NatsStatus) => void;
type SubscribedListener = (dialogId: string) => void;

class NatsBridgeClient {
  private channelId: string | null = null;
  private initPromise: Promise<void> | null = null;

  private status: NatsStatus = { state: 'disconnected', reconnect_count: 0 };
  private statusListeners = new Set<StatusListener>();
  private eventListeners = new Set<EventListener>();
  private subscribedListeners = new Set<SubscribedListener>();

  private pending: NatsEvent[] = [];
  private rafScheduled = false;

  /** Diagnostic — exposed for debugging from the console. */
  getRegisteredChannelId(): string | null {
    return this.channelId;
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
    await listen<NatsStatus>('nats:status', (e: TauriEvent<NatsStatus>) => {
      this.status = e.payload;
      this.statusListeners.forEach(l => {
        try {
          l(this.status);
        } catch (err) {
          console.error('[NATS] status listener error:', err);
        }
      });
    });

    await listen<{ dialogId: string }>('nats:subscribed', (e: TauriEvent<{ dialogId: string }>) => {
      const dialogId = e.payload?.dialogId;
      if (!dialogId) return;
      this.subscribedListeners.forEach(l => {
        try {
          l(dialogId);
        } catch (err) {
          console.error('[NATS] subscribed listener error:', err);
        }
      });
    });

    try {
      this.status = await invoke<NatsStatus>('nats_status');
    } catch (err) {
      console.warn('[NATS] initial nats_status invoke failed:', err);
    }

    const channel = new Channel<NatsEvent>();
    channel.onmessage = (event: NatsEvent) => this.receive(event);
    this.channelId = await invoke<string>('nats_register_event_channel', { channel });
  }

  private receive(event: NatsEvent): void {
    this.pending.push(event);
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    const flush = () => {
      this.rafScheduled = false;
      const batch = this.pending;
      this.pending = [];
      for (const evt of batch) {
        this.eventListeners.forEach(l => {
          try {
            l(evt);
          } catch (err) {
            console.error('[NATS] event listener error:', err);
          }
        });
      }
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(flush);
    } else {
      queueMicrotask(flush);
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

  async setMachineId(machineId: string): Promise<void> {
    if (!isTauri) return;
    try {
      await this.init();
      await invoke('nats_set_machine_id', { machineId });
    } catch (err) {
      console.warn('[NATS] nats_set_machine_id failed:', err);
    }
  }

  async subscribeDialog(dialogId: string, optStartSeq: number | null | undefined): Promise<void> {
    if (!isTauri) return;
    try {
      await this.init();
      await invoke('nats_subscribe_dialog', {
        dialogId,
        optStartSeq: typeof optStartSeq === 'number' ? optStartSeq : null,
      });
    } catch (err) {
      console.warn('[NATS] nats_subscribe_dialog failed:', err);
    }
  }

  async unsubscribeDialog(dialogId: string): Promise<void> {
    if (!isTauri) return;
    try {
      await invoke('nats_unsubscribe_dialog', { dialogId });
    } catch (err) {
      console.warn('[NATS] nats_unsubscribe_dialog failed:', err);
    }
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
    void natsBridge.init();
    return natsBridge.onStatus(setStatus);
  }, []);

  return {
    isConnected: status.state === 'connected',
    reconnectionCount: status.reconnect_count,
  };
}

/**
 * Pushes the machineId to Rust whenever it changes. No-op in Vite-only mode.
 * Idempotent — Rust short-circuits when the id is unchanged.
 */
export function useNatsMachineId(machineId: string | null): void {
  useEffect(() => {
    if (!isTauri || !machineId) return;
    void natsBridge.setMachineId(machineId);
  }, [machineId]);
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
  currentStreamSeq: number | null;
} {
  const onEventRef = useRef(onEvent);
  const onSubscribedRef = useRef(onSubscribed);
  onEventRef.current = onEvent;
  onSubscribedRef.current = onSubscribed;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentStreamSeq, setCurrentStreamSeq] = useState<number | null>(null);
  const highestSeqRef = useRef<number | null>(null);

  // Manage the Rust-side subscription lifecycle. Resets seq tracking on
  // dialog change so a fresh subscription starts with a clean dedup window.
  useEffect(() => {
    if (!isTauri || !enabled || !dialogId) return;
    highestSeqRef.current = null;
    setCurrentStreamSeq(null);
    setIsSubscribed(false);
    void natsBridge.subscribeDialog(dialogId, optStartSeq);
    return () => {
      void natsBridge.unsubscribeDialog(dialogId);
    };
  }, [enabled, dialogId, optStartSeq]);

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
          setCurrentStreamSeq(seq);
        } else {
          return;
        }
      }
      const chunk = { ...evt.payload, streamSeq: seq };
      onEventRef.current(chunk);
    });
  }, [enabled, dialogId]);

  return { isSubscribed, currentStreamSeq };
}
