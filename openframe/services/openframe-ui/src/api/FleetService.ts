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
  private static instance: FleetService;
  private baseURL: string;

  private constructor() {
    this.baseURL = import.meta.env.VITE_API_URL;
  }

  static getInstance(): FleetService {
    if (!FleetService.instance) {
      FleetService.instance = new FleetService();
    }
    return FleetService.instance;
  }

  private async request<T>(config: any): Promise<T> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios({ ...config, headers });
      return response.data;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // Get all hosts
  static async getHosts(): Promise<FleetHost[]> {
    return this.getInstance().request({
      url: `${API_URL}/hosts`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Get host by ID
  static async getHost(id: number): Promise<FleetHost> {
    return this.getInstance().request({
      url: `${API_URL}/hosts/${id}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Run live query on hosts
  static async runLiveQuery(query: string, hostIds: number[]): Promise<any> {
    return this.getInstance().request({
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
    return this.getInstance().request({
      url: `${API_URL}/hosts/${hostId}/policies`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // Create a new host
  static async createHost(host: Partial<FleetHost>): Promise<FleetHost> {
    return this.getInstance().request({
      url: `${API_URL}/hosts`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: host
    })
  }
} 