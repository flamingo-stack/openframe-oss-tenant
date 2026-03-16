/**
 * Fleet API Client
 * Extends the base API client with Fleet-specific functionality
 */

import { FleetHost, FleetHostResponse } from '../app/devices/types/fleet.types';
import { Policy } from '../app/monitoring/types/policies.types';
import { Query, QueryReportParams, QueryReportResponse } from '../app/monitoring/types/queries.types';
import { type ApiRequestOptions, type ApiResponse, apiClient } from './api-client';
import { runtimeEnv } from './runtime-config';

export interface PolicyHost {
  id: number;
  hostname: string;
}

export interface FleetLabel {
  id: number;
  name: string;
  description: string;
  label_type: string;
  label_membership_type: string;
}

interface Host {
  id: number;
  uuid: string;
  hostname: string;
  computer_name: string;
  display_name: string;
  platform: string;
  os_version: string;
  status: string;
  seen_time: string;
  primary_ip: string;
  hardware_model: string;
  hardware_serial: string;
  agent_version?: string;
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
}

class FleetApiClient {
  private baseUrl: string;
  private wsBaseUrl: string;

  constructor() {
    // Build base from tenant host when provided; otherwise relative via apiClient
    const tenantHost = runtimeEnv.tenantHostUrl() || '';
    this.baseUrl = `${tenantHost}/tools/fleetmdm-server`;
    this.wsBaseUrl = `${tenantHost}/ws/tools/fleetmdm-server`;
  }

  private buildFleetUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  async request<T = any>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const fleetUrl = this.buildFleetUrl(path);

    return apiClient.request<T>(fleetUrl, options);
  }

  async get<T = any>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  // Fleet specific methods - Policies

  async getPolicies(params?: { team_id?: number; query?: string }): Promise<ApiResponse<{ policies: Policy[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.team_id) queryParams.append('team_id', params.team_id.toString());
    if (params?.query) queryParams.append('query', params.query);

    const queryString = queryParams.toString();
    const path = queryString ? `/api/latest/fleet/policies?${queryString}` : '/api/latest/fleet/policies';

    return this.get(path);
  }

  async getPolicy(policyId: number): Promise<ApiResponse<{ policy: Policy }>> {
    return this.get(`/api/latest/fleet/policies/${policyId}`);
  }

  async createPolicy(policyData: {
    name: string;
    query: string;
    description: string;
    resolution?: string;
    team_id?: number;
    platform?: string;
    critical?: boolean;
    calendar_events_enabled?: boolean;
  }): Promise<ApiResponse<{ policy: Policy }>> {
    return this.post('/api/latest/fleet/policies', policyData);
  }

  async updatePolicy(
    policyId: number,
    policyData: Partial<{
      name: string;
      query: string;
      description: string;
      resolution: string;
      team_id?: number;
      platform?: string;
      critical?: boolean;
      calendar_events_enabled?: boolean;
    }>,
  ): Promise<ApiResponse<{ policy: Policy }>> {
    return this.patch(`/api/latest/fleet/policies/${policyId}`, policyData);
  }

  async deletePolicy(policyId: number): Promise<ApiResponse<void>> {
    return this.delete(`/api/latest/fleet/policies/${policyId}`);
  }

  async runPolicyOnHost(policyId: number, hostId: number): Promise<ApiResponse<any>> {
    return this.post(`/api/latest/fleet/policies/${policyId}/run`, { host_id: hostId });
  }

  // Fleet specific methods - Policy Host Assignments

  async getPolicyHosts(
    policyId: number,
    params?: { page?: number; per_page?: number },
  ): Promise<
    ApiResponse<{
      hosts: PolicyHost[];
      meta: { has_next_results: boolean; has_previous_results: boolean };
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.per_page !== undefined) queryParams.append('per_page', params.per_page.toString());
    const queryString = queryParams.toString();
    const path = queryString
      ? `/api/v1/fleet/policies/${policyId}/hosts?${queryString}`
      : `/api/v1/fleet/policies/${policyId}/hosts`;
    return this.get(path);
  }

  async addHostsToPolicy(policyId: number, hostIds: number[]): Promise<ApiResponse<{ added: number }>> {
    return this.post(`/api/v1/fleet/policies/${policyId}/hosts`, { host_ids: hostIds });
  }

  async removeHostsFromPolicy(policyId: number, hostIds: number[]): Promise<ApiResponse<{ removed: number }>> {
    return this.request(`/api/v1/fleet/policies/${policyId}/hosts`, {
      method: 'DELETE',
      body: JSON.stringify({ host_ids: hostIds }),
    });
  }

  async replacePolicyHosts(policyId: number, hostIds: number[]): Promise<ApiResponse<void>> {
    return this.put(`/api/v1/fleet/policies/${policyId}/hosts`, { host_ids: hostIds });
  }

  // Fleet specific methods - Queries

  async getQueries(params?: {
    team_id?: number;
    query?: string;
    order_key?: string;
    order_direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<ApiResponse<{ queries: Query[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.team_id) queryParams.append('team_id', params.team_id.toString());
    if (params?.query) queryParams.append('query', params.query);
    if (params?.order_key) queryParams.append('order_key', params.order_key);
    if (params?.order_direction) queryParams.append('order_direction', params.order_direction);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const queryString = queryParams.toString();
    const path = queryString ? `/api/latest/fleet/queries?${queryString}` : '/api/latest/fleet/queries';

    return this.get(path);
  }

  async getQuery(queryId: number): Promise<ApiResponse<Query>> {
    return this.get(`/api/latest/fleet/queries/${queryId}`);
  }

  async createQuery(queryData: {
    name: string;
    query: string;
    description?: string;
    observer_can_run?: boolean;
    team_id?: number | null;
    interval?: number;
    platform?: string;
    min_osquery_version?: string;
    automations_enabled?: boolean;
    logging?: string;
    discard_data?: boolean;
  }): Promise<ApiResponse<Query>> {
    return this.post('/api/latest/fleet/queries', queryData);
  }

  async updateQuery(
    queryId: number,
    queryData: Partial<{
      name: string;
      query: string;
      description?: string;
      observer_can_run?: boolean;
      team_id?: number | null;
      interval?: number;
      platform?: string;
      min_osquery_version?: string;
      automations_enabled?: boolean;
      logging?: string;
      discard_data?: boolean;
    }>,
  ): Promise<ApiResponse<Query>> {
    return this.patch(`/api/latest/fleet/queries/${queryId}`, queryData);
  }

  async deleteQuery(queryId: number): Promise<ApiResponse<void>> {
    return this.delete(`/api/latest/fleet/queries/${queryId}`);
  }

  async runQuery(
    queryId: number,
    params?: {
      host_ids?: number[];
      label_ids?: number[];
      team_ids?: number[];
    },
  ): Promise<ApiResponse<any>> {
    return this.post(`/api/latest/fleet/queries/${queryId}/run`, params);
  }

  async runLiveQuery(params: {
    query: string;
    query_id?: number | null;
    selected: {
      hosts: number[];
      labels: number[];
      teams: number[];
    };
  }): Promise<
    ApiResponse<{ campaign: { id: number; query_id: number; created_at: string; updated_at: string; user_id: number } }>
  > {
    return this.post('/api/latest/fleet/queries/run', params);
  }

  async getQueryReport(queryId: number, params?: QueryReportParams): Promise<ApiResponse<QueryReportResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.order_key) queryParams.append('order_key', params.order_key);
    if (params?.order_direction) queryParams.append('order_direction', params.order_direction);
    const queryString = queryParams.toString();
    const path = queryString
      ? `/api/latest/fleet/queries/${queryId}/report?${queryString}`
      : `/api/latest/fleet/queries/${queryId}/report`;
    return this.get(path);
  }

  // Fleet specific methods - Query Host Assignments

  async getQueryHosts(
    queryId: number,
    params?: { page?: number; per_page?: number },
  ): Promise<
    ApiResponse<{
      hosts: PolicyHost[];
      meta: { has_next_results: boolean; has_previous_results: boolean };
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.per_page !== undefined) queryParams.append('per_page', params.per_page.toString());
    const queryString = queryParams.toString();
    const path = queryString
      ? `/api/v1/fleet/queries/${queryId}/hosts?${queryString}`
      : `/api/v1/fleet/queries/${queryId}/hosts`;
    return this.get(path);
  }

  async addHostsToQuery(queryId: number, hostIds: number[]): Promise<ApiResponse<{ added: number }>> {
    return this.post(`/api/v1/fleet/queries/${queryId}/hosts`, { host_ids: hostIds });
  }

  async removeHostsFromQuery(queryId: number, hostIds: number[]): Promise<ApiResponse<{ removed: number }>> {
    return this.request(`/api/v1/fleet/queries/${queryId}/hosts`, {
      method: 'DELETE',
      body: JSON.stringify({ host_ids: hostIds }),
    });
  }

  async replaceQueryHosts(queryId: number, hostIds: number[]): Promise<ApiResponse<void>> {
    return this.put(`/api/v1/fleet/queries/${queryId}/hosts`, { host_ids: hostIds });
  }

  // Fleet specific methods - Hosts

  async getHosts(params?: {
    team_id?: number;
    query?: string;
    status?: string;
    order_key?: string;
    order_direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
    disable_failing_policies?: boolean;
    policy_id?: number;
    policy_response?: 'passing' | 'failing';
    device_mapping?: boolean;
  }): Promise<ApiResponse<{ hosts: Host[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.team_id) queryParams.append('team_id', params.team_id.toString());
    if (params?.query) queryParams.append('query', params.query);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.order_key) queryParams.append('order_key', params.order_key);
    if (params?.order_direction) queryParams.append('order_direction', params.order_direction);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.disable_failing_policies !== undefined) {
      queryParams.append('disable_failing_policies', params.disable_failing_policies.toString());
    }
    if (params?.policy_id) queryParams.append('policy_id', params.policy_id.toString());
    if (params?.policy_response) queryParams.append('policy_response', params.policy_response);
    if (params?.device_mapping !== undefined) queryParams.append('device_mapping', params.device_mapping.toString());

    const queryString = queryParams.toString();
    const path = queryString ? `/api/latest/fleet/hosts?${queryString}` : '/api/latest/fleet/hosts';

    return this.get(path);
  }

  async getHost(hostId: number): Promise<ApiResponse<FleetHostResponse>> {
    return this.get(`/api/latest/fleet/hosts/${hostId}`);
  }

  async getHostPolicies(hostId: number): Promise<ApiResponse<Policy[]>> {
    return this.get(`/api/latest/fleet/hosts/${hostId}/policies`);
  }

  async getHostQueries(hostId: number): Promise<ApiResponse<Query[]>> {
    return this.get(`/api/latest/fleet/hosts/${hostId}/queries`);
  }

  // Fleet specific methods - Teams

  async getTeams(): Promise<ApiResponse<any[]>> {
    return this.get('/api/latest/fleet/teams');
  }

  async getTeam(teamId: number): Promise<ApiResponse<any>> {
    return this.get(`/api/latest/fleet/teams/${teamId}`);
  }

  // Fleet specific methods - Labels

  async getLabels(): Promise<ApiResponse<{ labels: FleetLabel[] }>> {
    return this.get('/api/latest/fleet/labels');
  }

  async getLabel(labelId: number): Promise<ApiResponse<{ label: FleetLabel }>> {
    return this.get(`/api/latest/fleet/labels/${labelId}`);
  }

  async createLabel(data: { name: string; description: string }): Promise<ApiResponse<{ label: FleetLabel }>> {
    return this.post('/api/latest/fleet/labels', data);
  }

  async deleteLabel(id: number): Promise<ApiResponse<void>> {
    return this.delete(`/api/latest/fleet/labels/id/${id}`);
  }

  // Fleet specific methods - Counts

  async getPoliciesCount(params?: { query?: string }): Promise<ApiResponse<{ count: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append('query', params.query);
    const queryString = queryParams.toString();
    const path = queryString ? `/api/v1/fleet/policies/count?${queryString}` : '/api/v1/fleet/policies/count';
    return this.get(path);
  }

  async getHostsCount(params?: {
    policy_id?: number;
    policy_response?: 'passing' | 'failing';
    query?: string;
    status?: string;
    team_id?: number;
  }): Promise<ApiResponse<{ count: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.policy_id) queryParams.append('policy_id', params.policy_id.toString());
    if (params?.policy_response) queryParams.append('policy_response', params.policy_response);
    if (params?.query) queryParams.append('query', params.query);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.team_id) queryParams.append('team_id', params.team_id.toString());
    const queryString = queryParams.toString();
    const path = queryString ? `/api/v1/fleet/hosts/count?${queryString}` : '/api/v1/fleet/hosts/count';
    return this.get(path);
  }

  // Fleet specific methods - Packs

  async getPacks(): Promise<ApiResponse<any[]>> {
    return this.get('/api/latest/fleet/packs');
  }

  async getPack(packId: number): Promise<ApiResponse<any>> {
    return this.get(`/api/latest/fleet/packs/${packId}`);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getWsBaseUrl(): string {
    return this.wsBaseUrl;
  }

  getSockJsUrl(): string {
    // Unbiased random integer in [0, range) via rejection sampling
    const unbiasedRandom = (range: number): number => {
      const max = 0x100000000; // 2^32
      const limit = max - (max % range);
      const buf = new Uint32Array(1);
      let value: number;
      do {
        crypto.getRandomValues(buf);
        value = buf[0];
      } while (value >= limit);
      return value % range;
    };

    const serverId = String(unbiasedRandom(999)).padStart(3, '0');
    const sessionId = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).padStart(8, '0').substring(0, 8);
    return `${this.wsBaseUrl}/api/v1/fleet/results/${serverId}/${sessionId}/websocket`;
  }
}

const fleetApiClient = new FleetApiClient();

export { fleetApiClient, FleetApiClient };
export type { ApiResponse, ApiRequestOptions, Policy, Query, QueryReportResponse, QueryReportParams, Host };
