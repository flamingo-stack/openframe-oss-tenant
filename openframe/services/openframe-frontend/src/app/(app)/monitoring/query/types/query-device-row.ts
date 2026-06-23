export interface QueryDeviceTag {
  key: string;
  value: string;
}

/**
 * Row model for the Query Details "Assigned Devices" table. Built by merging the
 * query's assigned Fleet hosts (`getQueryHosts`) with the device registry so each
 * row carries display, organization, OS, online status and tag data.
 */
export interface QueryDeviceRow {
  id: string;
  hostname: string;
  displayName: string;
  deviceType: string | undefined;
  organization: string | undefined;
  organizationImageUrl: string | null | undefined;
  organizationImageHash: string | null | undefined;
  osType: string | undefined;
  /** Device connection status (e.g. ONLINE / OFFLINE) — drives the Status tag. */
  status: string;
  lastSeen: string | undefined;
  machineId: string | undefined;
  fleetHostId: number;
  tags: QueryDeviceTag[];
}
