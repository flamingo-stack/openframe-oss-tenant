'use client';

import type { QueryResultRow } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fleetApiClient } from '@/lib/fleet-api-client';
import type { WebSocketState } from '@/lib/meshcentral/websocket-manager';
import { WebSocketManager } from '@/lib/meshcentral/websocket-manager';

// ── Types ──────────────────────────────────────────────────────────

export interface CampaignError {
  host_id: number;
  host_display_name: string;
  osquery_version: string;
  error: string;
}

export interface CampaignTotals {
  count: number;
  online: number;
  offline: number;
  missing_in_action: number;
}

interface CampaignMessage {
  type: 'totals' | 'result' | 'status' | 'error';
  data: any;
}

export interface UseLiveCampaignReturn {
  startCampaign: (sql: string) => Promise<void>;
  stopCampaign: () => void;
  isRunning: boolean;
  startedAt: Date | null;
  durationMs: number;
  results: QueryResultRow[];
  errors: CampaignError[];
  totals: CampaignTotals | null;
  hostsResponded: number;
  hostsFailed: number;
  connectionState: WebSocketState;
  campaignStatus: '' | 'pending' | 'finished';
}

const CAMPAIGN_LIMIT = 250_000;

// ── SockJS helpers ─────────────────────────────────────────────────

function buildSockJsUrl(fleetBaseUrl: string): string {
  const wsBase = fleetBaseUrl.replace(/^http/, 'ws');
  const serverId = String(Math.floor(Math.random() * 999)).padStart(3, '0');
  const sessionId = Math.random().toString(36).substring(2, 10);
  return `${wsBase}/api/v1/fleet/results/${serverId}/${sessionId}/websocket`;
}

function encodeSockJsMessage(msg: object): string {
  return JSON.stringify([JSON.stringify(msg)]);
}

function parseSockJsFrame(raw: string): {
  type: 'open' | 'data' | 'heartbeat' | 'close';
  messages?: CampaignMessage[];
  closeInfo?: [number, string];
} | null {
  if (!raw || raw.length === 0) return null;

  const firstChar = raw[0];

  if (firstChar === 'o') {
    return { type: 'open' };
  }

  if (firstChar === 'h') {
    return { type: 'heartbeat' };
  }

  if (firstChar === 'a') {
    try {
      const strings = JSON.parse(raw.slice(1)) as string[];
      const messages = strings.map(s => JSON.parse(s) as CampaignMessage);
      return { type: 'data', messages };
    } catch {
      return null;
    }
  }

  if (firstChar === 'c') {
    try {
      const info = JSON.parse(raw.slice(1)) as [number, string];
      return { type: 'close', closeInfo: info };
    } catch {
      return null;
    }
  }

  return null;
}

// ── Cached "All Hosts" label lookup ────────────────────────────────

let cachedAllHostsLabelId: number | null = null;

async function getAllHostsLabelId(): Promise<number> {
  if (cachedAllHostsLabelId !== null) return cachedAllHostsLabelId;

  const res = await fleetApiClient.getLabels();
  if (!res.ok || !res.data?.labels) {
    throw new Error('Failed to fetch Fleet labels');
  }

  const allHostsLabel = res.data.labels.find(
    l => l.label_membership_type === 'dynamic' && l.name.toLowerCase().includes('all'),
  );

  if (!allHostsLabel) {
    throw new Error('Could not find "All Hosts" label in Fleet');
  }

  cachedAllHostsLabelId = allHostsLabel.id;
  return allHostsLabel.id;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useLiveCampaign(): UseLiveCampaignReturn {
  const { toast } = useToast();

  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [results, setResults] = useState<QueryResultRow[]>([]);
  const [errors, setErrors] = useState<CampaignError[]>([]);
  const [totals, setTotals] = useState<CampaignTotals | null>(null);
  const [hostsResponded, setHostsResponded] = useState(0);
  const [hostsFailed, setHostsFailed] = useState(0);
  const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');
  const [campaignStatus, setCampaignStatus] = useState<'' | 'pending' | 'finished'>('');

  const wsRef = useRef<WebSocketManager | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string | null>(null);
  const responseCountRef = useRef({ results: 0, errors: 0 });
  const campaignIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.dispose();
      wsRef.current = null;
    }
    previousDataRef.current = null;
    responseCountRef.current = { results: 0, errors: 0 };
    campaignIdRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const stopCampaign = useCallback(() => {
    cleanup();
    if (isMountedRef.current) {
      setIsRunning(false);
      setCampaignStatus('finished');
      setConnectionState('disconnected');
    }
  }, [cleanup]);

  const handleCampaignMessage = useCallback(
    (msg: CampaignMessage) => {
      if (!isMountedRef.current) return;

      switch (msg.type) {
        case 'totals': {
          setTotals({
            count: msg.data.count,
            online: msg.data.online,
            offline: msg.data.offline,
            missing_in_action: msg.data.missing_in_action,
          });
          break;
        }

        case 'result': {
          // Check campaign limit
          const count = responseCountRef.current;
          if (count.results + count.errors >= CAMPAIGN_LIMIT) {
            toast({
              title: 'Campaign limit reached',
              description: `Stopped after ${CAMPAIGN_LIMIT.toLocaleString()} results`,
              variant: 'destructive',
            });
            stopCampaign();
            return;
          }

          const hasError = msg.data.error !== null;
          if (hasError) {
            const err: CampaignError = {
              host_id: msg.data.host?.id,
              host_display_name: msg.data.host?.display_name || 'Unknown',
              osquery_version: msg.data.host?.osquery_version || '',
              error: msg.data.error || 'Error details require osquery 4.4.0+',
            };
            setErrors(prev => [...prev, err]);
            setHostsFailed(prev => prev + 1);
            count.errors++;
          } else {
            const rows: QueryResultRow[] = (msg.data.rows || []).map((row: Record<string, unknown>) => ({
              host_display_name: msg.data.host?.display_name || 'Unknown',
              ...row,
            }));
            setResults(prev => [...prev, ...rows]);
            setHostsResponded(prev => prev + 1);
            count.results += rows.length;
          }
          break;
        }

        case 'status': {
          setCampaignStatus(msg.data.status);
          if (msg.data.status === 'finished') {
            stopCampaign();
          }
          break;
        }

        case 'error': {
          const errorStr = typeof msg.data === 'string' ? msg.data : 'Unknown campaign error';
          toast({
            title: 'Campaign Error',
            description: errorStr,
            variant: 'destructive',
          });
          break;
        }
      }
    },
    [stopCampaign, toast],
  );

  const startCampaign = useCallback(
    async (sql: string) => {
      if (!sql.trim()) {
        toast({ title: 'Query is required', description: 'Enter a query before testing', variant: 'destructive' });
        return;
      }

      // Reset state
      cleanup();
      setResults([]);
      setErrors([]);
      setTotals(null);
      setHostsResponded(0);
      setHostsFailed(0);
      setCampaignStatus('');
      setConnectionState('disconnected');

      try {
        // 1. Get "All Hosts" label
        const labelId = await getAllHostsLabelId();

        // 2. Create campaign
        const res = await fleetApiClient.runLiveQuery({
          query: sql,
          query_id: null,
          selected: { hosts: [], labels: [labelId], teams: [] },
        });

        if (!res.ok || !res.data?.campaign) {
          throw new Error(res.error || 'Failed to create live campaign');
        }

        const campaignId = res.data.campaign.id;
        campaignIdRef.current = campaignId;

        // 3. Start timer
        const now = new Date();
        setStartedAt(now);
        setDurationMs(0);
        setIsRunning(true);

        const startTime = now.getTime();
        timerRef.current = setInterval(() => {
          if (isMountedRef.current) {
            setDurationMs(Date.now() - startTime);
          }
        }, 1000);

        // 4. Open WebSocket with SockJS framing
        const fleetBaseUrl = fleetApiClient.getBaseUrl();
        const wsUrl = buildSockJsUrl(fleetBaseUrl);
        const token = localStorage.getItem('of_access_token') || '';

        const ws = new WebSocketManager({
          url: wsUrl,
          enableMessageQueue: false,
          refreshTokenBeforeReconnect: false,
          maxReconnectAttempts: 3,
          onStateChange: state => {
            if (isMountedRef.current) setConnectionState(state);
          },
          onMessage: event => {
            const raw = typeof event.data === 'string' ? event.data : '';

            // Deduplication
            if (raw === previousDataRef.current) return;
            previousDataRef.current = raw;

            const frame = parseSockJsFrame(raw);
            if (!frame) return;

            switch (frame.type) {
              case 'open': {
                // SockJS connection established — send auth + subscribe
                ws.send(encodeSockJsMessage({ type: 'auth', data: { token } }));
                ws.send(encodeSockJsMessage({ type: 'select_campaign', data: { campaign_id: campaignId } }));
                break;
              }
              case 'data': {
                frame.messages?.forEach(msg => handleCampaignMessage(msg));
                break;
              }
              case 'heartbeat': {
                // Ignore
                break;
              }
              case 'close': {
                ws.disconnect();
                break;
              }
            }
          },
          onError: () => {
            if (isMountedRef.current) {
              toast({
                title: 'WebSocket Error',
                description: 'Connection error during live campaign',
                variant: 'destructive',
              });
            }
          },
          onClose: () => {
            // Connection closed — if campaign wasn't finished, mark as stopped
            if (isMountedRef.current && campaignIdRef.current === campaignId) {
              setConnectionState('disconnected');
            }
          },
        });

        wsRef.current = ws;
        await ws.connect();
      } catch (error) {
        cleanup();
        if (isMountedRef.current) {
          setIsRunning(false);
          setCampaignStatus('finished');
          const message = error instanceof Error ? error.message : 'Failed to start campaign';
          toast({ title: 'Test Failed', description: message, variant: 'destructive' });
        }
      }
    },
    [cleanup, handleCampaignMessage, toast],
  );

  return {
    startCampaign,
    stopCampaign,
    isRunning,
    startedAt,
    durationMs,
    results,
    errors,
    totals,
    hostsResponded,
    hostsFailed,
    connectionState,
    campaignStatus,
  };
}
