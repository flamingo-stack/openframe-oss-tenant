import { fetchEventSource, EventSourceMessage } from '@microsoft/fetch-event-source';
import {
  ConnectionState,
  RetryConfig,
  ErrorType,
  ClassifiedError,
  ConnectionStateCallback,
  RetryCallback
} from '../types/chat.types';

/**
 * Error class to signal that no further retry attempts should be made
 */
class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
}

/**
 * Default retry configuration with exponential backoff and jitter
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 10,
  baseDelay: 1000,      // Start with 1 second
  maxDelay: 30000,      // Cap at 30 seconds
  jitterRatio: 0.5,     // Random 0-50% reduction
  connectionTimeout: 30000  // 30 second connection timeout
};

export interface SSEConnectionOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: HeadersInit;
  body?: string;
  retryConfig?: Partial<RetryConfig>;
  onStateChange?: ConnectionStateCallback;
  onRetry?: RetryCallback;
  onMessage?: (event: EventSourceMessage) => void;
  onOpen?: (response: Response) => void;
  debugMode?: boolean;
}

/**
 * Resilient SSE connection wrapper with automatic retry, exponential backoff,
 * and connection state management
 */
export class ResilientSSEConnection {
  private state: ConnectionState = ConnectionState.IDLE;
  private retryCount: number = 0;
  private lastEventId: string | null = null;
  private config: RetryConfig;
  private abortController: AbortController | null = null;
  private connectionStartTime: number = 0;
  private isManualClose: boolean = false;

  constructor(private options: SSEConnectionOptions) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
  }

  /**
   * Starts the SSE connection with automatic retry logic
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      console.warn('[ResilientSSE] Already connecting or connected');
      return;
    }

    this.isManualClose = false;
    this.abortController = new AbortController();
    this.updateState(ConnectionState.CONNECTING);

    try {
      await this.connectWithRetry();
    } catch (error) {
      const classified = this.classifyError(error);
      this.updateState(ConnectionState.FAILED, classified);
      throw error;
    }
  }

  /**
   * Main connection logic with retry capability
   */
  private async connectWithRetry(): Promise<void> {
    this.connectionStartTime = Date.now();

    await fetchEventSource(this.options.url, {
      method: this.options.method || 'POST',
      headers: {
        ...this.options.headers,
        ...(this.lastEventId ? { 'Last-Event-ID': this.lastEventId } : {})
      },
      body: this.options.body,
      signal: this.abortController!.signal,

      onopen: async (response) => {
        if (response.ok) {
          // Successfully connected
          this.retryCount = 0;
          this.updateState(ConnectionState.CONNECTED);

          if (this.options.debugMode) {
            const connTime = Date.now() - this.connectionStartTime;
            console.log(`[ResilientSSE] Connected in ${connTime}ms`);
          }

          if (this.options.onOpen) {
            this.options.onOpen(response);
          }
        } else {
          // Server returned error status
          const error = new Error(`Server error: ${response.status} ${response.statusText}`);
          (error as any).status = response.status;
          throw error;
        }
      },

      onmessage: (event) => {
        // Update last event ID for resumable streams
        if (event.id) {
          this.lastEventId = event.id;
        }

        if (this.options.onMessage) {
          this.options.onMessage(event);
        }
      },

      onclose: () => {
        // Connection closed by server
        if (this.isManualClose) {
          this.updateState(ConnectionState.CLOSED);
          return;
        }

        if (this.options.debugMode) {
          console.log('[ResilientSSE] Connection closed by server, attempting reconnect...');
        }

        // Only retry if we haven't exceeded max retries
        if (this.retryCount < this.config.maxRetries) {
          this.handleRetry();
          throw new Error('Connection closed, retrying...');
        } else {
          throw new FatalError('Max retries exceeded');
        }
      },

      onerror: (error) => {
        if (this.isManualClose) {
          throw new FatalError('Connection manually closed');
        }

        const classified = this.classifyError(error);

        if (this.options.debugMode) {
          console.error('[ResilientSSE] Error:', classified.message, {
            type: classified.type,
            shouldRetry: classified.shouldRetry,
            attempt: this.retryCount + 1,
            maxRetries: this.config.maxRetries
          });
        }

        // Don't retry on auth errors or client errors
        if (!classified.shouldRetry) {
          this.updateState(ConnectionState.FAILED, classified);
          throw new FatalError(classified.message);
        }

        // Check if we've exceeded max retries
        if (this.retryCount >= this.config.maxRetries) {
          this.updateState(ConnectionState.FAILED, classified);
          throw new FatalError(`Max retries (${this.config.maxRetries}) exceeded`);
        }

        // Handle retry
        this.handleRetry();
        throw error; // This will trigger a retry
      }
    });
  }

  /**
   * Handles retry logic with exponential backoff and jitter
   */
  private handleRetry(): void {
    this.retryCount++;
    this.updateState(ConnectionState.RECONNECTING);

    const delay = this.calculateBackoff();

    if (this.options.debugMode) {
      console.log(`[ResilientSSE] Retry ${this.retryCount}/${this.config.maxRetries} in ${delay}ms`);
    }

    if (this.options.onRetry) {
      this.options.onRetry(this.retryCount, delay);
    }

    // The library handles the actual delay, we just need to track state
  }

  /**
   * Calculates exponential backoff delay with jitter
   */
  private calculateBackoff(): number {
    // Exponential backoff: baseDelay * 2^retryCount
    const exponentialDelay = Math.min(
      this.config.baseDelay * Math.pow(2, this.retryCount),
      this.config.maxDelay
    );

    // Add jitter: random reduction of 0 to jitterRatio percent
    const jitter = exponentialDelay * this.config.jitterRatio * Math.random();

    return Math.floor(exponentialDelay - jitter);
  }

  /**
   * Classifies errors for appropriate handling
   */
  private classifyError(error: any): ClassifiedError {
    // Check for abort (manual close)
    if (error.name === 'AbortError') {
      return {
        type: ErrorType.NETWORK,
        message: 'Connection aborted',
        shouldRetry: false,
        originalError: error
      };
    }

    // Check for HTTP status codes
    const status = error.status || (error.response && error.response.status);

    if (status) {
      // Authentication errors
      if (status === 401 || status === 403) {
        return {
          type: ErrorType.AUTH,
          message: `Authentication failed: ${status}`,
          status,
          shouldRetry: false,
          originalError: error
        };
      }

      // Client errors (4xx) - don't retry
      if (status >= 400 && status < 500) {
        return {
          type: ErrorType.CLIENT,
          message: `Client error: ${status}`,
          status,
          shouldRetry: false,
          originalError: error
        };
      }

      // Server errors (5xx) - retry with backoff
      if (status >= 500) {
        return {
          type: ErrorType.SERVER,
          message: `Server error: ${status}`,
          status,
          shouldRetry: true,
          originalError: error
        };
      }
    }

    // Network errors - retry
    if (error.message && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch')
    )) {
      return {
        type: ErrorType.NETWORK,
        message: error.message || 'Network error',
        shouldRetry: true,
        originalError: error
      };
    }

    // Timeout errors - retry
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return {
        type: ErrorType.TIMEOUT,
        message: 'Connection timeout',
        shouldRetry: true,
        originalError: error
      };
    }

    // Unknown errors - retry cautiously
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || 'Unknown error',
      shouldRetry: true,
      originalError: error
    };
  }

  /**
   * Updates connection state and notifies listeners
   */
  private updateState(newState: ConnectionState, error?: ClassifiedError): void {
    this.state = newState;

    if (this.options.debugMode) {
      console.log(`[ResilientSSE] State: ${this.state}`, error ? { error: error.message } : {});
    }

    if (this.options.onStateChange) {
      this.options.onStateChange(newState, error);
    }
  }

  /**
   * Manually close the connection (no retry)
   */
  close(): void {
    this.isManualClose = true;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.updateState(ConnectionState.CLOSED);

    if (this.options.debugMode) {
      console.log('[ResilientSSE] Connection manually closed');
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get current retry count
   */
  getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Get last event ID (for debugging)
   */
  getLastEventId(): string | null {
    return this.lastEventId;
  }

  /**
   * Reset retry counter (useful after successful reconnection for a long time)
   */
  resetRetryCount(): void {
    this.retryCount = 0;
  }
}
