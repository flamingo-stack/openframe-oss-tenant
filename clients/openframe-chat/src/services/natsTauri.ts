// Tauri-side NATS bridge client.
//
// The Rust side owns the NATS WebSocket connection (see
// src-tauri/src/nats_bridge.rs). On the WebView we register a single
// `Channel<NatsEvent>` for the lifetime of the app, then fan out in JS to
// any number of React subscribers. Status comes via the `nats:status`
// Tauri event.

import { Channel, invoke } from '@tauri-apps/api/core';
import { listen, type Event as TauriEvent } from '@tauri-apps/api/event';
import { useEffect, useMemo, useRef, useState } from 'react';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface NatsStatus {
  state: ConnectionState;
  reconnect_count: number;
}

export interface NatsEvent {
  dialog_id: string;
  payload: unknown;
}

type EventListener = (event: NatsEvent) => void;
type StatusListener = (status: NatsStatus) => void;

class NatsBridgeClient {
  // Held to keep the Channel reachable (its onmessage handler is invoked
  // by Tauri's IPC layer) and to allow future cleanup via the channel id.
  private channel: Channel<NatsEvent> | null = null;
  private channelId: string | null = null;
  private initPromise: Promise<void> | null = null;

  /** Diagnostic — exposed for debugging from the console. */
  getRegisteredChannelId(): string | null {
    return this.channelId;
  }
  /** Diagnostic — exposed for debugging from the console. */
  hasChannel(): boolean {
    return this.channel !== null;
  }

  private status: NatsStatus = { state: 'disconnected', reconnect_count: 0 };
  private statusListeners = new Set<StatusListener>();
  private eventListeners = new Set<EventListener>();

  // Multiple call sites can drive the tracked-dialog set independently
  // (useTickets contributes its known dialogs; useChat may push the
  // freshly-created dialog id before tickets refresh). We merge by source
  // id and re-send to Rust whenever any source changes.
  private dialogSources = new Map<string, Set<string>>();
  private currentTrackedKey = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch(err => {
        // Allow subsequent retries
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    // Subscribe to status events first so we don't miss any during init.
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

    try {
      this.status = await invoke<NatsStatus>('nats_status');
    } catch (err) {
      console.warn('[NATS] initial nats_status invoke failed:', err);
    }

    const channel = new Channel<NatsEvent>();
    channel.onmessage = (event: NatsEvent) => {
      this.eventListeners.forEach(l => {
        try {
          l(event);
        } catch (err) {
          console.error('[NATS] event listener error:', err);
        }
      });
    };
    this.channel = channel;
    this.channelId = await invoke<string>('nats_register_event_channel', { channel });
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

  updateDialogSource(sourceId: string, ids: string[]): void {
    this.dialogSources.set(sourceId, new Set(ids));
    this.scheduleFlush();
  }

  removeDialogSource(sourceId: string): void {
    if (this.dialogSources.delete(sourceId)) {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 100);
  }

  private async flush(): Promise<void> {
    const merged = new Set<string>();
    this.dialogSources.forEach(set => set.forEach(id => merged.add(id)));
    const key = [...merged].sort().join('|');
    if (key === this.currentTrackedKey) return;
    this.currentTrackedKey = key;
    try {
      await invoke('nats_set_tracked_dialogs', { dialogIds: [...merged] });
    } catch (err) {
      console.error('[NATS] nats_set_tracked_dialogs failed:', err);
    }
  }
}

export const natsBridge = new NatsBridgeClient();

/* ----------------------------- React hooks ----------------------------- */

export function useNatsBridgeLiveness(): {
  isConnected: boolean;
  isSubscribed: boolean;
  reconnectionCount: number;
} {
  const [status, setStatus] = useState<NatsStatus>(natsBridge.getStatus());

  useEffect(() => {
    void natsBridge.init();
    return natsBridge.onStatus(setStatus);
  }, []);

  return {
    isConnected: status.state === 'connected',
    isSubscribed: status.state === 'connected',
    reconnectionCount: status.reconnect_count,
  };
}

export function useNatsBridgeEvents(onEvent: (event: NatsEvent) => void): void {
  const cbRef = useRef(onEvent);
  useEffect(() => {
    cbRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    void natsBridge.init();
    return natsBridge.onEvent(evt => cbRef.current(evt));
  }, []);
}

export function useNatsBridgeTrackDialogs(dialogIds: string[]): void {
  const sourceId = useMemo(() => `src-${Math.random().toString(36).slice(2)}-${Date.now()}`, []);
  const idsRef = useRef(dialogIds);
  idsRef.current = dialogIds;
  const key = useMemo(() => [...dialogIds].sort().join('|'), [dialogIds]);

  useEffect(() => {
    void natsBridge.init();
    // key changes whenever dialogIds content changes; idsRef holds the
    // current snapshot so we read the latest array without depending on
    // its identity.
    void key;
    natsBridge.updateDialogSource(sourceId, idsRef.current);
    return () => natsBridge.removeDialogSource(sourceId);
  }, [sourceId, key]);
}
