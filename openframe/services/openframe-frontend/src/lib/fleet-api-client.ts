/**
 * Fleet API Client
 * Extends the base API client with Fleet-specific functionality
 */

import { apiClient, type ApiResponse, type ApiRequestOptions } from './api-client'
import { Policy } from '../app/policies-and-queries/types/policies.types'

interface Query {
  id: number
  name: string
  query: string
  description: string
  author_id: number
  author_name: string
  author_email: string
  saved: boolean
  observer_can_run: boolean
  team_id?: number | null
  team_id_char?: string | null
  pack_id?: number | null
  interval: number
  platform?: string
  min_osquery_version?: string
  automations_enabled: boolean
  logging?: string
  discard_data?: boolean
  created_at: string
  updated_at: string
  software?: string
  last_executed?: string
  output_size?: string
}

interface Host {
  id: number
  hostname: string
  status: string
  platform: string
  os_version: string
  agent_version: string
  last_seen: string
  created_at: string
  updated_at: string
}

class FleetApiClient {
  private baseUrl: string

  constructor() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
    this.baseUrl = apiUrl.replace('/api', '') + '/tools/fleetmdm-server'
  }

  private buildFleetUrl(path: string): string {
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
    const fleetUrl = this.buildFleetUrl(path)
    
    return apiClient.request<T>(fleetUrl, options)
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

  // Fleet specific methods - Policies

  async getPolicies(params?: {
    team_id?: number
    query?: string
  }): Promise<ApiResponse<{ policies: Policy[] }>> {
    const queryParams = new URLSearchParams()
    if (params?.team_id) queryParams.append('team_id', params.team_id.toString())
    if (params?.query) queryParams.append('query', params.query)
    
    const queryString = queryParams.toString()
    const path = queryString ? `/api/latest/fleet/policies?${queryString}` : '/api/latest/fleet/policies'
    
    return this.get(path)
  }

  async getPolicy(policyId: number): Promise<ApiResponse<Policy>> {
    return this.get(`/api/latest/fleet/policies/${policyId}`)
  }

  async createPolicy(policyData: {
    name: string
    query: string
    description: string
    resolution?: string
    team_id?: number
    platform?: string
    critical?: boolean
    calendar_events_enabled?: boolean
  }): Promise<ApiResponse<Policy>> {
    return this.post('/api/latest/fleet/policies', policyData)
  }

  async updatePolicy(policyId: number, policyData: Partial<{
    name: string
    query: string
    description: string
    resolution: string
    team_id?: number
    platform?: string
    critical?: boolean
    calendar_events_enabled?: boolean
  }>): Promise<ApiResponse<Policy>> {
    return this.patch(`/api/latest/fleet/policies/${policyId}`, policyData)
  }

  async deletePolicy(policyId: number): Promise<ApiResponse<void>> {
    return this.delete(`/api/latest/fleet/policies/${policyId}`)
  }

  async runPolicyOnHost(policyId: number, hostId: number): Promise<ApiResponse<any>> {
    return this.post(`/api/latest/fleet/policies/${policyId}/run`, { host_id: hostId })
  }

  // Fleet specific methods - Queries

  async getQueries(params?: {
    team_id?: number
    query?: string
    order_key?: string
    order_direction?: 'asc' | 'desc'
    per_page?: number
    page?: number
  }): Promise<ApiResponse<{ queries: Query[] }>> {
    const queryParams = new URLSearchParams()
    if (params?.team_id) queryParams.append('team_id', params.team_id.toString())
    if (params?.query) queryParams.append('query', params.query)
    if (params?.order_key) queryParams.append('order_key', params.order_key)
    if (params?.order_direction) queryParams.append('order_direction', params.order_direction)
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    
    const queryString = queryParams.toString()
    const path = queryString ? `/api/latest/fleet/queries?${queryString}` : '/api/latest/fleet/queries'
    
    return this.get(path)
  }

  async getQuery(queryId: number): Promise<ApiResponse<Query>> {
    return this.get(`/api/latest/fleet/queries/${queryId}`)
  }

  async createQuery(queryData: {
    name: string
    query: string
    description?: string
    observer_can_run?: boolean
    team_id?: number | null
    interval?: number
    platform?: string
    min_osquery_version?: string
    automations_enabled?: boolean
    logging?: string
    discard_data?: boolean
  }): Promise<ApiResponse<Query>> {
    return this.post('/api/latest/fleet/queries', queryData)
  }

  async updateQuery(queryId: number, queryData: Partial<{
    name: string
    query: string
    description?: string
    observer_can_run?: boolean
    team_id?: number | null
    interval?: number
    platform?: string
    min_osquery_version?: string
    automations_enabled?: boolean
    logging?: string
    discard_data?: boolean
  }>): Promise<ApiResponse<Query>> {
    return this.patch(`/api/latest/fleet/queries/${queryId}`, queryData)
  }

  async deleteQuery(queryId: number): Promise<ApiResponse<void>> {
    return this.delete(`/api/latest/fleet/queries/${queryId}`)
  }

  async runQuery(queryId: number, params?: {
    host_ids?: number[]
    label_ids?: number[]
    team_ids?: number[]
  }): Promise<ApiResponse<any>> {
    return this.post(`/api/latest/fleet/queries/${queryId}/run`, params)
  }

  async runLiveQuery(params: {
    query: string
    host_ids?: number[]
    label_ids?: number[]
    team_ids?: number[]
  }): Promise<ApiResponse<any>> {
    return this.post('/api/latest/fleet/queries/run', params)
  }

  // Fleet specific methods - Hosts

  async getHosts(params?: {
    team_id?: number
    query?: string
    status?: string
    order_key?: string
    order_direction?: 'asc' | 'desc'
    per_page?: number
    page?: number
    disable_failing_policies?: boolean
  }): Promise<ApiResponse<{ hosts: Host[] }>> {
    const queryParams = new URLSearchParams()
    if (params?.team_id) queryParams.append('team_id', params.team_id.toString())
    if (params?.query) queryParams.append('query', params.query)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.order_key) queryParams.append('order_key', params.order_key)
    if (params?.order_direction) queryParams.append('order_direction', params.order_direction)
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.disable_failing_policies !== undefined) {
      queryParams.append('disable_failing_policies', params.disable_failing_policies.toString())
    }
    
    const queryString = queryParams.toString()
    const path = queryString ? `/api/latest/fleet/hosts?${queryString}` : '/api/latest/fleet/hosts'
    
    return this.get(path)
  }

  async getHost(hostId: number): Promise<ApiResponse<Host>> {
    return this.get(`/api/latest/fleet/hosts/${hostId}`)
  }

  async getHostPolicies(hostId: number): Promise<ApiResponse<Policy[]>> {
    return this.get(`/api/latest/fleet/hosts/${hostId}/policies`)
  }

  async getHostQueries(hostId: number): Promise<ApiResponse<Query[]>> {
    return this.get(`/api/latest/fleet/hosts/${hostId}/queries`)
  }

  // Fleet specific methods - Teams

  async getTeams(): Promise<ApiResponse<any[]>> {
    return this.get('/api/latest/fleet/teams')
  }

  async getTeam(teamId: number): Promise<ApiResponse<any>> {
    return this.get(`/api/latest/fleet/teams/${teamId}`)
  }

  // Fleet specific methods - Labels

  async getLabels(): Promise<ApiResponse<any[]>> {
    return this.get('/api/latest/fleet/labels')
  }

  async getLabel(labelId: number): Promise<ApiResponse<any>> {
    return this.get(`/api/latest/fleet/labels/${labelId}`)
  }

  // Fleet specific methods - Packs

  async getPacks(): Promise<ApiResponse<any[]>> {
    return this.get('/api/latest/fleet/packs')
  }

  async getPack(packId: number): Promise<ApiResponse<any>> {
    return this.get(`/api/latest/fleet/packs/${packId}`)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }
}

const fleetApiClient = new FleetApiClient()

export { fleetApiClient, FleetApiClient }
export type { ApiResponse, ApiRequestOptions, Policy, Query, Host }