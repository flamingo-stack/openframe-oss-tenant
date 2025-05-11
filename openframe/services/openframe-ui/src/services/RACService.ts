import { restClient } from '../apollo/apolloClient';
import { ConfigService } from '../config/config.service';
import { ToastService } from './ToastService';

export class RACService {
  private static instance: RACService;
  private configService: ConfigService;
  private toastService: ToastService;
  private apiUrl: string;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.toastService = ToastService.getInstance();
    const runtimeConfig = this.configService.getConfig();
    this.apiUrl = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
  }

  static getInstance(): RACService {
    if (!RACService.instance) {
      RACService.instance = new RACService();
    }
    return RACService.instance;
  }

  /**
   * Fetches detailed information for a specific device
   * @param deviceId The ID of the device to fetch details for
   * @returns The merged device information or null if there was an error
   */
  async fetchDeviceDetails(deviceId: string) {
    try {
      const listDevicesResponse = await restClient.get<any>(`${this.apiUrl}/api/listdevices?filterid=${deviceId}`);
      console.log('List devices response:', listDevicesResponse);

      let deviceInfoResponse = {};
      if (listDevicesResponse.length > 0) {
        deviceInfoResponse = await restClient.get<any>(`${this.apiUrl}/api/deviceinfo?id=${deviceId}`);
        console.log('Device info response:', deviceInfoResponse);
      }

      // Merge the responses
      const response = {
        ...deviceInfoResponse,
        ...listDevicesResponse[0],
      };
      console.log('Merged response:', JSON.stringify(response));

      // Return the merged data
      return response;
    } catch (error) {
      console.error('Failed to fetch device details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch device details';
      this.toastService.showError(errorMessage);
      return null;
    }
  }

  /**
   * Fetches all devices from MeshCentral
   */
  async fetchDevices() {
    try {
      const response = await restClient.get<any[]>(`${this.apiUrl}/api/listdevices`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch devices';
      this.toastService.showError(errorMessage);
      return [];
    }
  }

  /**
   * Fetches recent events from MeshCentral
   */
  async fetchRecentEvents(size: number = 5) {
    try {
      const events = await restClient.get<any[]>(`${this.apiUrl}/api/listevents?limit=${size}`);
      return Array.isArray(events) ? events : [];
    } catch (error) {
      console.error('Failed to fetch recent events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent events';
      this.toastService.showError(errorMessage);
      return [];
    }
  }

  /**
   * Executes a command on a device
   */
  async executeCommand(deviceId: string, command: string, usePowerShell: boolean = false) {
    try {
      const response = await restClient.post<string>(`${this.apiUrl}/api/runcommand`, {
        id: deviceId,
        command,
        powershell: usePowerShell
      });

      return response || 'No output';
    } catch (error) {
      console.error('Failed to execute command:', error);
      const errorMessage = error instanceof Error ? error.message :
        (typeof error === 'object' && error !== null && 'data' in error ?
          (error as { data: string }).data : 'Failed to execute command');
      this.toastService.showError(errorMessage);
      throw error;
    }
  }

  /**
   * Deletes a device from MeshCentral
   */
  async deleteDevice(deviceId: string) {
    try {
      await restClient.post(`${this.apiUrl}/api/removedevice`, {
        id: deviceId
      });
      return true;
    } catch (error) {
      console.error('Failed to delete device:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete device';
      this.toastService.showError(errorMessage);
      return false;
    }
  }

  /**
   * Gets the URL for remote access to a device
   */
  getRemoteAccessUrl(deviceId: string): string {
    return `${this.apiUrl}/connect?id=${deviceId}`;
  }

  /**
   * Gets the URL for file transfer with a device
   */
  getFileTransferUrl(deviceId: string): string {
    return `${this.apiUrl}/files?id=${deviceId}`;
  }

  /**
   * Prepares to run a command on a device
   * This method can be used to do any pre-command execution preparation
   * @param device The device to prepare for command execution
   * @returns The device ID to use for the command
   */
  prepareCommandExecution(device: any): string {
    // Extract the device ID
    const deviceId = device.originalId || device._id || device.id;

    if (!deviceId) {
      throw new Error('Device ID not available');
    }

    return deviceId;
  }
} 