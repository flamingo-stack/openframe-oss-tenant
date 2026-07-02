/**
 * Tactical RMM API Client
 * Extends the base API client with Tactical-specific functionality
 */

import { type ApiRequestOptions, type ApiResponse, apiClient } from './api-client';
import { runtimeEnv } from './runtime-config';

class TacticalApiClient {
  private baseUrl: string;

  constructor() {
    // Build base from tenant host when provided; otherwise relative paths via apiClient
    const tenantHost = runtimeEnv.tenantHostUrl() || '';
    this.baseUrl = `${tenantHost}/tools/tactical-rmm`;
  }

  private buildTacticalUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  async request<T = any>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const tacticalUrl = this.buildTacticalUrl(path);

    return apiClient.request<T>(tacticalUrl, options);
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

  // Tactical RMM specific methods

  /**
   * Fetch a single Tactical RMM agent. Used only to enrich the Tactical tool
   * connection's live status/last-seen on the device-details Agents tab —
   * Tactical is otherwise no longer a device-details data source.
   */
  async getAgent(agentId: string): Promise<ApiResponse<any>> {
    return this.get(`/agents/${agentId}/`);
  }

  async runScript(
    agentId: string,
    scriptData: {
      output: string;
      emails: string[];
      emailMode: string;
      custom_field: any;
      save_all_output: boolean;
      script: number;
      args: any[];
      env_vars: any[];
      timeout: number;
      run_as_user: boolean;
      run_on_server: boolean;
    },
  ): Promise<ApiResponse<any>> {
    return this.post(`/agents/${agentId}/runscript/`, scriptData);
  }

  async runBulkAction(payload: any): Promise<ApiResponse<any>> {
    return this.post('/agents/actions/bulk/', payload);
  }

  async getScripts(): Promise<ApiResponse<any[]>> {
    return this.get('/scripts/');
  }

  async getScriptsV2(params?: {
    search?: string;
    cursor?: string;
    page_size?: number;
    supported_platforms?: string;
  }): Promise<ApiResponse<{ next: string | null; previous: string | null; results: any[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.supported_platforms) queryParams.append('supported_platforms', params.supported_platforms);
    const qs = queryParams.toString();
    return this.get(qs ? `/v2/scripts/?${qs}` : '/v2/scripts/');
  }

  async getScript(scriptId: string): Promise<ApiResponse<any>> {
    return this.get(`/scripts/${scriptId}/`);
  }

  async createScript(scriptData: {
    name: string;
    shell: string;
    default_timeout: number;
    args: string[];
    script_body: string;
    run_as_user: boolean;
    env_vars: string[];
    description: string;
    supported_platforms: string[];
    category: string;
  }): Promise<ApiResponse<any>> {
    return this.post('/scripts/', scriptData);
  }

  async updateScript(
    scriptId: string,
    scriptData: {
      name: string;
      shell: string;
      default_timeout: number;
      args: string[];
      script_body: string;
      run_as_user: boolean;
      env_vars: string[];
      description: string;
      supported_platforms: string[];
      category: string;
    },
  ): Promise<ApiResponse<any>> {
    return this.put(`/scripts/${scriptId}/`, scriptData);
  }

  // Script Schedule methods

  async getScriptSchedules(): Promise<ApiResponse<any[]>> {
    return this.get('/script-schedules/');
  }

  async getScriptSchedule(id: number | string): Promise<ApiResponse<any>> {
    return this.get(`/script-schedules/${id}/`);
  }

  async createScriptSchedule(data: any): Promise<ApiResponse<any>> {
    return this.post('/script-schedules/', data);
  }

  async updateScriptSchedule(id: number | string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/script-schedules/${id}/`, data);
  }

  async deleteScriptSchedule(id: number | string): Promise<ApiResponse<any>> {
    return this.delete(`/script-schedules/${id}/`);
  }

  async getScriptScheduleAgents(id: number | string): Promise<ApiResponse<any[]>> {
    return this.get(`/script-schedules/${id}/agents/`);
  }

  async replaceScriptScheduleAgents(id: number | string, agents: string[]): Promise<ApiResponse<any>> {
    return this.put(`/script-schedules/${id}/agents/`, { agents });
  }

  async addScriptScheduleAgents(id: number | string, agents: string[]): Promise<ApiResponse<any>> {
    return this.post(`/script-schedules/${id}/agents/`, { agents });
  }

  async removeScriptScheduleAgents(id: number | string, agents: string[]): Promise<ApiResponse<any>> {
    return this.request(`/script-schedules/${id}/agents/`, {
      method: 'DELETE',
      body: JSON.stringify({ agents }),
    });
  }

  async getScriptScheduleHistory(
    id: number | string,
    params?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const path = queryString ? `/script-schedules/${id}/history/?${queryString}` : `/script-schedules/${id}/history/`;

    return this.get(path);
  }

  async getScheduledTasks(): Promise<ApiResponse<any[]>> {
    return this.get('/tasks/');
  }

  async getScheduledTask(taskId: string): Promise<ApiResponse<any>> {
    return this.get(`/tasks/${taskId}/`);
  }

  async deleteScheduledTask(taskId: string): Promise<ApiResponse<any>> {
    return this.delete(`/tasks/${taskId}/`);
  }

  async createScheduledTask(
    agentId: string,
    taskData: {
      actions: Array<{
        type: 'script';
        name: string;
        script: number;
        timeout: number;
        script_args: string[];
        env_vars: string[];
        run_as_user: boolean;
      }>;
      name: string;
      task_type: 'daily' | 'weekly' | 'monthly' | 'runonce';
      run_time_date: string;
      expire_date?: string | null;
      daily_interval?: number;
      weekly_interval?: number;
      run_time_bit_weekdays?: number | null;
      monthly_days_of_month?: number[] | null;
      monthly_months_of_year?: number[] | null;
      monthly_weeks_of_month?: number[] | null;
      random_task_delay?: string | null;
      task_repetition_interval?: string | null;
      task_repetition_duration?: string | null;
      stop_task_at_duration_end?: boolean;
      task_instance_policy?: number;
      run_asap_after_missed?: boolean;
      remove_if_not_scheduled?: boolean;
      continue_on_error?: boolean;
      alert_severity?: 'info' | 'warning' | 'error';
      collector_all_output?: boolean;
      custom_field?: any;
      assigned_check?: any;
      task_supported_platforms?: string[];
    },
  ): Promise<ApiResponse<any>> {
    return this.post('/tasks/', {
      ...taskData,
      agent: agentId,
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

const tacticalApiClient = new TacticalApiClient();

export { tacticalApiClient, TacticalApiClient };
export type { ApiRequestOptions, ApiResponse };
