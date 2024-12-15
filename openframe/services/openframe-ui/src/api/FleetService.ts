import axios from 'axios'
import environment from '../config/environment'

const API_URL = `${environment.apiUrl}/fleet`

export interface FleetResponse {
  // Common response fields
  message?: string
  errors?: Array<{
    name: string
    reason: string
  }>
}

export interface FleetHost {
  id: number
  hostname: string
  display_name: string
  platform: string
  status: string
  osquery_version: string
  primary_ip: string
  last_seen: string
  uuid: string
  serial_number?: string
}

export interface FleetPolicy {
  id: number
  name: string
  query: string
  description: string
  resolution: string
  platform: string
  response: string
}

export class FleetService {
  private static async request<T>(config: any): Promise<T> {
    try {
      const token = localStorage.getItem('access_token')
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      
      const response = await axios({
        ...config,
        headers: {
          ...config.headers,
          ...headers
        }
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message)
      }
      throw error
    }
  }

  // Get all hosts
  static async getHosts(): Promise<FleetHost[]> {
    return this.request({
      url: `${API_URL}/hosts`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Get host by ID
  static async getHost(id: number): Promise<FleetHost> {
    return this.request({
      url: `${API_URL}/hosts/${id}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Run live query on hosts
  static async runLiveQuery(query: string, hostIds: number[]): Promise<any> {
    return this.request({
      url: `${API_URL}/queries/run`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        query,
        selected: {
          hosts: hostIds
        }
      }
    })
  }

  // Get policies for a host
  static async getHostPolicies(hostId: number): Promise<FleetPolicy[]> {
    return this.request({
      url: `${API_URL}/hosts/${hostId}/policies`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Create a new host
  static async createHost(host: Partial<FleetHost>): Promise<FleetHost> {
    return this.request({
      url: `${API_URL}/hosts`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: host
    })
  }
} 