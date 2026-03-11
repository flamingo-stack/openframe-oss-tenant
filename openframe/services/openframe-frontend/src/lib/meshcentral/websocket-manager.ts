import { isTokenRefreshing, refreshAccessToken, waitForRefresh } from '../token-refresh-manager';

export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface WebSocketManagerOptions {
  url: string | (() => string);
  maxReconnectAttempts?: number;
  reconnectBackoff?: number[];
  onStateChange?: (state: WebSocketState) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  shouldReconnect?: (closeEvent: CloseEvent) => boolean;
  onBeforeReconnect?: () => Promise<void> | void;
  refreshTokenBeforeReconnect?: boolean;
  protocols?: string | string[];
  binaryType?: BinaryType;
  enableMessageQueue?: boolean;
  heartbeatInterval?: number;
  heartbeatMessage?: string | (() => string);
  heartbeatTimeout?: number;
}

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private state: WebSocketState = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<string | ArrayBuffer | Blob> = [];
  private isDisposed = false;
  private isConnecting = false;
  private lastConnectTime = 0;
  private lastRefreshAttempt = 0;
  private browserListenersAttached = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private lastMessageTime = 0;
  private options: Required<
    Omit<
      WebSocketManagerOptions,
      'protocols' | 'heartbeatInterval' | 'heartbeatMessage' | 'heartbeatTimeout' | 'onBeforeReconnect'
    >
  > &
    Pick<
      WebSocketManagerOptions,
      'protocols' | 'heartbeatInterval' | 'heartbeatMessage' | 'heartbeatTimeout' | 'onBeforeReconnect'
    >;

  constructor(options: WebSocketManagerOptions) {
    this.options = {
      maxReconnectAttempts: 10,
      reconnectBackoff: [1000, 2000, 4000, 8000, 16000, 30000],
      onStateChange: () => {
        // noop
      },
      onMessage: () => {
        // noop
      },
      onError: () => {
        // noop
      },
      onOpen: () => {},
      onClose: () => {},
      shouldReconnect: () => true,
      refreshTokenBeforeReconnect: true,
      binaryType: 'arraybuffer',
      enableMessageQueue: true,
      ...options,
    };
  }

  private setState(newState: WebSocketState) {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onStateChange(newState);
    }
  }

  private async refreshTokenIfNeeded(forceRefresh: boolean = false): Promise<boolean> {
    if (!this.options.refreshTokenBeforeReconnect) return true;

    try {
      if (isTokenRefreshing()) {
        return await waitForRefresh();
      }

      // Throttle refresh checks to at most once every 30 seconds unless forced
      if (!forceRefresh) {
        const sinceLast = Date.now() - this.lastRefreshAttempt;
        if (sinceLast < 30_000) {
          return true;
        }
      }

      this.lastRefreshAttempt = Date.now();
      return await refreshAccessToken();
    } catch (_error) {
      return false;
    }
  }

  private getUrl(): string {
    const url = typeof this.options.url === 'function' ? this.options.url() : this.options.url;
    return url;
  }

  async connect(): Promise<void> {
    if (
      this.isDisposed ||
      this.isConnecting ||
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.isConnecting = true;
    this.cleanup();
    this.attachBrowserListeners();
    this.setState('connecting');

    try {
      const url = this.getUrl();

      this.socket = new WebSocket(url, this.options.protocols);
      this.socket.binaryType = this.options.binaryType;
      this.setupEventHandlers();
    } catch (_error) {
      this.isConnecting = false;
      this.setState('failed');
      this.scheduleReconnect(false);
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.onopen = event => {
      this.isConnecting = false;
      this.setState('connected');
      this.reconnectAttempt = 0;
      this.lastConnectTime = Date.now();

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.flushMessageQueue();
      this.startHeartbeat();

      this.options.onOpen(event);
    };

    this.socket.onmessage = event => {
      this.lastMessageTime = Date.now();
      this.options.onMessage(event);
    };

    this.socket.onerror = event => {
      this.options.onError(event);
    };

    this.socket.onclose = event => {
      this.isConnecting = false;
      this.setState('disconnected');
      this.options.onClose(event);

      if (!this.isDisposed && this.options.shouldReconnect(event)) {
        // Check for auth failure (1008, 4401 or specific close reasons)
        const isAuthFailure =
          event.code === 1008 ||
          event.code === 4401 ||
          event.reason?.toLowerCase().includes('auth') ||
          event.reason?.toLowerCase().includes('unauthorized');

        this.scheduleReconnect(isAuthFailure);
      } else if (!this.isDisposed) {
        this.setState('failed');
      }
    };
  }

  private async scheduleReconnect(forceRefresh: boolean = false) {
    if (this.isDisposed || this.reconnectTimer) return;

    if (this.reconnectAttempt >= this.options.maxReconnectAttempts) {
      this.setState('failed');
      return;
    }

    const backoffIndex = Math.min(this.reconnectAttempt, this.options.reconnectBackoff.length - 1);
    const baseDelay = this.options.reconnectBackoff[backoffIndex];
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1); // +-25% jitter
    const delay = Math.max(500, Math.round(baseDelay + jitter));

    this.setState('reconnecting');

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      if (this.isDisposed) return;

      this.reconnectAttempt++;

      // If we somehow reconnected already, abort this scheduled attempt
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.setState('connected');
        return;
      }

      const tokenRefreshed = await this.refreshTokenIfNeeded(forceRefresh);

      if (this.socket?.readyState === WebSocket.OPEN) {
        this.setState('connected');
        return;
      }

      if (!tokenRefreshed && this.options.refreshTokenBeforeReconnect) {
        this.scheduleReconnect(forceRefresh);
        return;
      }

      try {
        await this.options.onBeforeReconnect?.();
      } catch {}

      // Re-check after async hook — connection might have recovered
      if (this.isDisposed || this.socket?.readyState === WebSocket.OPEN) {
        return;
      }

      await this.connect();
    }, delay);
  }

  send(data: string | ArrayBuffer | Blob): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(data);
        return true;
      } catch (_error) {
        if (this.options.enableMessageQueue) {
          this.messageQueue.push(data);
        }
        return false;
      }
    } else {
      if (this.options.enableMessageQueue) {
        this.messageQueue.push(data);
      }

      if (this.state === 'disconnected' || this.state === 'failed') {
        if (this.reconnectTimer || this.socket?.readyState === WebSocket.CONNECTING) {
          return false;
        }
        this.reconnectAttempt = 0;
        this.scheduleReconnect(false);
      }

      return false;
    }
  }

  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message !== undefined) {
        try {
          this.socket.send(message);
        } catch (_error) {
          this.messageQueue.unshift(message);
          break;
        }
      }
    }
  }

  reconnect() {
    this.isDisposed = false;
    this.reconnectAttempt = 0;
    this.cleanup();
    this.connect();
  }

  disconnect() {
    this.isDisposed = true;
    this.cleanup();
    this.setState('disconnected');
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      // Tab hidden: pause reconnection attempts but keep live connections
      return;
    }
    // Tab visible again — if we're in a bad state, reconnect immediately
    if (!this.isDisposed && (this.state === 'failed' || this.state === 'disconnected')) {
      this.reconnectAttempt = 0;
      this.scheduleReconnect(false);
    }
  };

  private handleOnline = () => {
    if (
      !this.isDisposed &&
      (this.state === 'disconnected' || this.state === 'failed' || this.state === 'reconnecting')
    ) {
      this.reconnectAttempt = 0;
      this.scheduleReconnect(false);
    }
  };

  private handleOffline = () => {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  };

  private attachBrowserListeners() {
    if (this.browserListenersAttached || typeof window === 'undefined') return;
    this.browserListenersAttached = true;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private detachBrowserListeners() {
    if (!this.browserListenersAttached || typeof window === 'undefined') return;
    this.browserListenersAttached = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    const interval = this.options.heartbeatInterval;
    if (!interval) return;

    const timeout = this.options.heartbeatTimeout ?? Math.round(interval * 1.5);
    const getMessage = () => {
      const msg = this.options.heartbeatMessage ?? 'ping';
      return typeof msg === 'function' ? msg() : msg;
    };

    this.lastMessageTime = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(getMessage());
        } catch (_error) {
          this.handleStaleConnection();
          return;
        }

        this.heartbeatTimeoutTimer = setTimeout(() => {
          if (Date.now() - this.lastMessageTime >= timeout) {
            this.handleStaleConnection();
          }
        }, timeout);
      }
    }, interval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private handleStaleConnection() {
    this.stopHeartbeat();
    if (this.socket) {
      try {
        this.socket.close(4000, 'Heartbeat timeout');
      } catch (_error) {
        this.cleanup();
        if (!this.isDisposed) {
          this.scheduleReconnect(false);
        }
      }
    }
  }

  private cleanup() {
    this.isConnecting = false;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;

      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        try {
          this.socket.close(1000, 'Normal closure');
        } catch (error) {
          console.error('Error closing socket:', error);
        }
      }

      this.socket = null;
    }
  }

  getState(): WebSocketState {
    return this.state;
  }

  getReadyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  isConnectionHealthy(): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    if (this.options.heartbeatInterval) {
      const timeout = this.options.heartbeatTimeout ?? Math.round(this.options.heartbeatInterval * 1.5);
      return Date.now() - this.lastMessageTime < timeout;
    }
    return true;
  }

  dispose() {
    this.disconnect();
    this.detachBrowserListeners();
    this.messageQueue = [];
  }
}
