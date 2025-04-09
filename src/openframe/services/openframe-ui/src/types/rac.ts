import type { ApiKey, UrlAction, KeyStore, CustomField } from './settings';

// Device interface for RAC module, based on MeshCentral data structure
export interface Device {
  id: string;
  hostname: string;
  plat: string; // platform (windows, linux, darwin)
  operating_system: string;
  status: string;
  last_seen: string;
  public_ip: string;
  local_ips: string[];
  // Additional fields can be added based on MeshCentral API response
}

// Base API response interface
export interface ApiResponse<T> {
  data: T;
}

// Command response using the base interface
export interface CommandResponse extends ApiResponse<{
  output: string;
}> {}

// Device response using the base interface
export interface DeviceResponse extends ApiResponse<Device[]> {}

// History related interfaces
export interface ConnectionHistory {
  id: number;
  time: string;
  type: string; // remote_connection, file_transfer
  username: string;
  duration: number;
  device_id: string;
}

// Statistics interfaces for dashboard
export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  onlineRate: number;
}

export interface ConnectionStats {
  total: number;
  active: number;
  completed: number;
}

export interface TransferStats {
  total: number;
  uploads: number;
  downloads: number;
}
