import { restClient } from '../apollo/apolloClient';
import { ConfigService } from '../config/config.service';

export interface FleetResponse<T> {
  data: T;
}

export interface Device {
  id: number;
  hostname: string;
  display_name?: string;
  status: string;
  platform: string;
  os_version: string;
  device_uuid?: string;
  mdm?: {
    enrollment_status: string | null;
  };
}

export interface Policy {
  id: number;
  name: string;
  query: string;
  critical: boolean;
  description: string;
  author_id: number;
  author_name: string;
  author_email: string;
  team_id: number | null;
  resolution: string;
  platform: string | null;
  calendar_events_enabled: boolean;
  created_at: string;
  updated_at: string;
  passing_host_count: number;
  failing_host_count: number;
  host_count_updated_at: string | null;
  enabled?: boolean;
  scope?: 'global' | 'team';
}

export interface Activity {
  created_at: string;
  type: string;
  details: string;
}

export interface CreatePolicyPayload {
  name: string;
  description: string;
  platform: string;
  query: string;
  enabled: boolean;
}

export class FleetService {
  private static instance: FleetService;
  private readonly VITE_API_URL: string;

  private constructor() {
    const configService = ConfigService.getInstance();
    const config = configService.getConfig();
    this.VITE_API_URL = `${config.gatewayUrl}/tools/fleet/api/v1/fleet`;
  }

  public static getInstance(): FleetService {
    if (!FleetService.instance) {
      FleetService.instance = new FleetService();
    }
    return FleetService.instance;
  }

  // Device Operations
  async getDevices(): Promise<Device[]> {
    const response = await restClient.get(`${this.VITE_API_URL}/hosts`) as FleetResponse<Device[]>;
    return response.data || [];
  }

  async lockDevice(deviceUuid: string): Promise<void> {
    await restClient.post(`${this.VITE_API_URL}/devices/${deviceUuid}/lock`);
  }

  async unlockDevice(deviceUuid: string): Promise<void> {
    await restClient.post(`${this.VITE_API_URL}/devices/${deviceUuid}/unlock`);
  }

  async eraseDevice(deviceUuid: string): Promise<void> {
    await restClient.post(`${this.VITE_API_URL}/devices/${deviceUuid}/erase`);
  }

  async deleteDevice(deviceId: number): Promise<void> {
    await restClient.delete(`${this.VITE_API_URL}/hosts/${deviceId}`);
  }

  // Policy Operations
  async getPolicies(): Promise<Policy[]> {
    const response = await restClient.get(`${this.VITE_API_URL}/global/policies`) as FleetResponse<Policy[]>;
    return response.data || [];
  }

  async createPolicy(payload: CreatePolicyPayload): Promise<void> {
    await restClient.post(`${this.VITE_API_URL}/global/policies`, payload);
  }

  async updatePolicy(policyId: number, payload: CreatePolicyPayload): Promise<void> {
    await restClient.patch(`${this.VITE_API_URL}/global/policies/${policyId}`, payload);
  }

  async deletePolicy(policyId: number): Promise<void> {
    await restClient.delete(`${this.VITE_API_URL}/global/policies/${policyId}`);
  }

  // Activity Operations
  async getRecentActivities(limit: number = 5): Promise<Activity[]> {
    const response = await restClient.get(`${this.VITE_API_URL}/activities?limit=${limit}`) as FleetResponse<Activity[]>;
    return response.data || [];
  }

  // Helper Functions
  formatPlatform(platform: string): string {
    const platformMap: Record<string, string> = {
      darwin: 'macOS',
      windows: 'Windows',
      linux: 'Linux',
      ios: 'iOS',
      ipados: 'iPadOS',
      chrome: 'Chrome OS'
    };
    return platformMap[platform] || platform;
  }

  getPlatformSeverity(platform: string): string {
    const severityMap: Record<string, string> = {
      darwin: 'info',
      windows: 'warning',
      linux: 'success',
      ios: 'info',
      ipados: 'info',
      chrome: 'warning'
    };
    return severityMap[platform] || 'info';
  }

  getStatusSeverity(status: string): string {
    const severityMap: Record<string, string> = {
      online: 'success',
      offline: 'danger',
      unknown: 'warning'
    };
    return severityMap[status] || 'warning';
  }

  getMDMStatusSeverity(status: string | null): string {
    if (!status) return 'danger';
    if (status.toLowerCase().includes('on')) return 'success';
    if (status.toLowerCase().includes('pending')) return 'warning';
    return 'info';
  }

  getActivitySeverity(type: string): string {
    const severityMap: Record<string, string> = {
      enrollment: 'success',
      unenrollment: 'danger',
      policy_violation: 'warning',
      profile_installation: 'info',
      command: 'warning'
    };
    return severityMap[type] || 'info';
  }
} 