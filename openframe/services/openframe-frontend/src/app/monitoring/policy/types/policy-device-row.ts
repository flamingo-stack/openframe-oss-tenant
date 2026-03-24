export type ComplianceStatus = 'non-compliant' | 'passing';

export interface PolicyDeviceRow {
  id: string;
  hostname: string;
  displayName: string;
  deviceType: string | undefined;
  organization: string | undefined;
  organizationImageUrl: string | null | undefined;
  osType: string | undefined;
  complianceStatus: ComplianceStatus;
  machineId: string | undefined;
  fleetHostId: number;
}
