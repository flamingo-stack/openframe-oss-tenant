'use client';

import type { QueryResultRow } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { runtimeEnv } from '@/lib/runtime-config';

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

type SockJsConnectionState = 'disconnected' | 'connecting' | 'connected';

// ── SockJS frame helpers ──────────────────────────────────────────

function buildWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws');
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
  const ch = raw[0];
  if (ch === 'o') return { type: 'open' };
  if (ch === 'h') return { type: 'heartbeat' };
  if (ch === 'a') {
    try {
      const strings = JSON.parse(raw.slice(1)) as string[];
      const messages = strings.map(s => JSON.parse(s) as CampaignMessage);
      return { type: 'data', messages };
    } catch {
      return null;
    }
  }
  if (ch === 'c') {
    try {
      return { type: 'close', closeInfo: JSON.parse(raw.slice(1)) as [number, string] };
    } catch {
      return null;
    }
  }
  return null;
}

export interface UseLiveCampaignReturn {
  startCampaign: (sql: string, hostIds: number[]) => Promise<void>;
  stopCampaign: () => void;
  isRunning: boolean;
  startedAt: Date | null;
  durationMs: number;
  results: QueryResultRow[];
  errors: CampaignError[];
  totals: CampaignTotals | null;
  hostsResponded: number;
  hostsFailed: number;
  connectionState: SockJsConnectionState;
  campaignStatus: '' | 'pending' | 'finished';
}

const CAMPAIGN_LIMIT = 250_000;

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

// ── Fleet API token fetch ─────────────────────────────────────────

const GET_FLEET_API_TOKEN_QUERY = `
  query GetFleetApiToken {
    integratedTools(search: "fleetmdm") {
      tools {
        id
        toolType
        credentials {
          apiKey {
            key
          }
        }
      }
    }
  }
`;

async function fetchFleetApiToken(): Promise<string> {
  const response = await apiClient.post<{
    data?: {
      integratedTools: {
        tools: Array<{
          id: string;
          toolType: string;
          credentials?: { apiKey?: { key: string } | null } | null;
        }>;
      };
    };
    errors?: Array<{ message: string }>;
  }>('/api/graphql', {
    query: GET_FLEET_API_TOKEN_QUERY,
  });

  if (!response.ok) {
    throw new Error(response.error || 'Failed to fetch Fleet API token');
  }

  const graphql = response.data;
  if (graphql?.errors?.length) {
    throw new Error(graphql.errors[0].message);
  }

  const tools = graphql?.data?.integratedTools?.tools ?? [];
  const fleetTool = tools.find(t => t.toolType === 'FLEET_MDM' || t.id === 'fleetmdm-server');
  const token = fleetTool?.credentials?.apiKey?.key;

  if (!token) {
    throw new Error('Fleet MDM API token not found');
  }

  return token;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useLiveCampaign(): UseLiveCampaignReturn {
  const { toast } = useToast();

  const { data: fleetApiToken } = useQuery({
    queryKey: ['fleet-api-token'],
    queryFn: fetchFleetApiToken,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [results, setResults] = useState<QueryResultRow[]>([]);
  const [errors, setErrors] = useState<CampaignError[]>([]);
  const [totals, setTotals] = useState<CampaignTotals | null>(null);
  const [hostsResponded, setHostsResponded] = useState(0);
  const [hostsFailed, setHostsFailed] = useState(0);
  const [connectionState, setConnectionState] = useState<SockJsConnectionState>('disconnected');
  const [campaignStatus, setCampaignStatus] = useState<'' | 'pending' | 'finished'>('');

  const wsRef = useRef<WebSocket | null>(null);
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
      wsRef.current.close();
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
    async (sql: string, hostIds: number[]) => {
      if (!sql.trim()) {
        toast({ title: 'Query is required', description: 'Enter a query before testing', variant: 'destructive' });
        return;
      }

      if (!fleetApiToken) {
        toast({ title: 'Fleet API token not available', description: 'Please try again', variant: 'destructive' });
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
        // 1. Build target selection — use selected hosts if provided, otherwise fall back to all hosts
        const selected =
          hostIds.length > 0
            ? { hosts: hostIds, labels: [], teams: [] }
            : { hosts: [], labels: [await getAllHostsLabelId()], teams: [] };

        // 2. Create campaign
        const res = await fleetApiClient.runLiveQuery({
          query: sql,
          query_id: null,
          selected,
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

        // 4. Open native WebSocket with SockJS framing
        let wsUrl = buildWsUrl(fleetApiClient.getSockJsUrl());
        try {
          if (runtimeEnv.enableDevTicketObserver() && typeof window !== 'undefined') {
            const devToken = localStorage.getItem('of_access_token');
            if (devToken) wsUrl += `?authorization=${encodeURIComponent(devToken)}`;
          }
        } catch {
          // Ignore — non-dev-ticket mode
        }

        setConnectionState('connecting');
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMountedRef.current) return;
          // WebSocket transport open — wait for SockJS 'o' frame before sending
        };

        socket.onmessage = (event: MessageEvent) => {
          const raw = typeof event.data === 'string' ? event.data : '';

          // Deduplication
          if (raw === previousDataRef.current) return;
          previousDataRef.current = raw;

          const frame = parseSockJsFrame(raw);
          if (!frame) return;

          switch (frame.type) {
            case 'open': {
              setConnectionState('connected');
              socket.send(encodeSockJsMessage({ type: 'auth', data: { token: fleetApiToken } }));
              socket.send(encodeSockJsMessage({ type: 'select_campaign', data: { campaign_id: campaignId } }));
              break;
            }
            case 'data':
              frame.messages?.forEach(msg => handleCampaignMessage(msg));
              break;
            case 'heartbeat':
              break;
            case 'close':
              socket.close();
              break;
          }
        };

        socket.onerror = () => {
          if (isMountedRef.current) {
            toast({
              title: 'WebSocket Error',
              description: 'Connection error during live campaign',
              variant: 'destructive',
            });
          }
        };

        socket.onclose = () => {
          // Connection closed — stop the campaign if it hasn't finished naturally
          if (isMountedRef.current && campaignIdRef.current === campaignId) {
            stopCampaign();
          }
        };
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
    [cleanup, fleetApiToken, handleCampaignMessage, stopCampaign, toast],
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
