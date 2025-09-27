/**
 * Tactical RMM API Client
 * Extends the base API client with Tactical-specific functionality
 */

import { apiClient, type ApiResponse, type ApiRequestOptions } from './api-client'
import { runtimeEnv } from './runtime-config'

class TacticalApiClient {
  private baseUrl: string

  constructor() {
    const apiUrl = runtimeEnv.apiUrl()
    this.baseUrl = apiUrl.replace('/api', '') + '/tools/tactical-rmm'
  }

  private buildTacticalUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    
    return `${this.baseUrl}/${cleanPath}`
  }

  async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const tacticalUrl = this.buildTacticalUrl(path)
    
    return apiClient.request<T>(tacticalUrl, options)
  }

  async get<T = any>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  async post<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T = any>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  // Tactical RMM specific methods

  async getAgents(): Promise<ApiResponse<any[]>> {
    return this.get('/agents/')
  }

  async getAgent(agentId: string): Promise<ApiResponse<any>> {
    return this.get(`/agents/${agentId}/`)
  }

  async runScript(agentId: string, scriptData: {
    output: string
    emails: string[]
    emailMode: string
    custom_field: any
    save_all_output: boolean
    script: number
    args: any[]
    env_vars: any[]
    timeout: number
    run_as_user: boolean
    run_on_server: boolean
  }): Promise<ApiResponse<any>> {
    return this.post(`/agents/${agentId}/runscript/`, scriptData)
  }

  async getScripts(): Promise<ApiResponse<any[]>> {
    return this.get('/scripts/')
  }

  async getScript(scriptId: string): Promise<ApiResponse<any>> {
    return this.get(`/scripts/${scriptId}/`)
  }

  async createScript(scriptData: {
    name: string
    shell: string
    default_timeout: number
    args: string[]
    script_body: string
    run_as_user: boolean
    env_vars: string[]
    description: string
    supported_platforms: string[]
    category: string
  }): Promise<ApiResponse<any>> {
    return this.post('/scripts/', scriptData)
  }

  async updateScript(scriptId: string, scriptData: {
    name: string
    shell: string
    default_timeout: number
    args: string[]
    script_body: string
    run_as_user: boolean
    env_vars: string[]
    description: string
    supported_platforms: string[]
    category: string
  }): Promise<ApiResponse<any>> {
    return this.put(`/scripts/${scriptId}/`, scriptData)
  }

  async getAgentLogs(agentId: string, params?: {
    limit?: number
    offset?: number
    search?: string
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    
    const queryString = queryParams.toString()
    const path = queryString ? `/agents/${agentId}/logs/?${queryString}` : `/agents/${agentId}/logs/`
    
    return this.get(path)
  }

  async getAgentChecks(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/checks/`)
  }

  async getAgentTasks(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/tasks/`)
  }

  async getAgentServices(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/services/`)
  }

  async getAgentProcesses(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/processes/`)
  }

  async getAgentSoftware(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/software/`)
  }

  async getAgentWindowsServices(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/winservices/`)
  }

  async getAgentEventLogs(agentId: string, params?: {
    limit?: number
    offset?: number
    level?: string
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.level) queryParams.append('level', params.level)
    
    const queryString = queryParams.toString()
    const path = queryString ? `/agents/${agentId}/eventlogs/?${queryString}` : `/agents/${agentId}/eventlogs/`
    
    return this.get(path)
  }

  async getAgentSystemInfo(agentId: string): Promise<ApiResponse<any>> {
    return this.get(`/agents/${agentId}/systeminfo/`)
  }

  async getAgentDiskInfo(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/disks/`)
  }

  async getAgentNetworkInfo(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/network/`)
  }

  async getAgentUsers(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/users/`)
  }

  async getAgentGroups(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/groups/`)
  }

  async getAgentPolicies(agentId: string): Promise<ApiResponse<any[]>> {
    return this.get(`/agents/${agentId}/policies/`)
  }

  async getAgentChecksHistory(agentId: string, checkId: string, params?: {
    limit?: number
    offset?: number
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    
    const queryString = queryParams.toString()
    const path = queryString 
      ? `/agents/${agentId}/checks/${checkId}/history/?${queryString}` 
      : `/agents/${agentId}/checks/${checkId}/history/`
    
    return this.get(path)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }
}

const tacticalApiClient = new TacticalApiClient()

export { tacticalApiClient, TacticalApiClient }
export type { ApiResponse, ApiRequestOptions }
