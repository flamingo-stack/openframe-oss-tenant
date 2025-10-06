export enum ToolUrlType {
    DASHBOARD = 'DASHBOARD',
    API = 'API',
    DATABASE = 'DATABASE',
    CACHE = 'CACHE',
    BROKER = 'BROKER',
    COORDINATOR = 'COORDINATOR',
    CONTROLLER = 'CONTROLLER',
    SERVER = 'SERVER',
    METRICS = 'METRICS',
    LOGS = 'LOGS',
    INTERNAL = 'INTERNAL'
    NATS = 'NATS'
}

export enum APIKeyType {
    HEADER = 'HEADER',
    BEARER_TOKEN = 'BEARER_TOKEN'
}

export enum DeviceStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    MAINTENANCE = 'MAINTENANCE',
    DECOMMISSIONED = 'DECOMMISSIONED'
}

export enum DeviceType {
    DESKTOP = 'DESKTOP',
    LAPTOP = 'LAPTOP',
    SERVER = 'SERVER',
    MOBILE_DEVICE = 'MOBILE_DEVICE',
    TABLET = 'TABLET',
    NETWORK_DEVICE = 'NETWORK_DEVICE',
    IOT_DEVICE = 'IOT_DEVICE',
    VIRTUAL_MACHINE = 'VIRTUAL_MACHINE',
    CONTAINER_HOST = 'CONTAINER_HOST',
    OTHER = 'OTHER'
}

export interface APIKey {
    key: string;
    type: APIKeyType;
    keyName?: string;
}

export interface ToolUrl {
    url: string;
    port?: string;
    type: ToolUrlType;
}

export interface ToolCredentials {
    username?: string;
    password?: string;
    apiKey?: APIKey;
}

export interface IntegratedTool {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    toolUrls: ToolUrl[];
    type?: string;
    toolType?: string;
    category?: string;
    platformCategory?: string;
    enabled: boolean;
    credentials?: ToolCredentials;
    
    // Layer information
    layer?: string;
    layerOrder?: number;
    layerColor?: string;
    
    // Monitoring configuration
    metricsPath?: string;
    healthCheckEndpoint?: string;
    healthCheckInterval?: number;
    connectionTimeout?: number;
    readTimeout?: number;
    allowedEndpoints?: string[];
}

export interface ToolFilterInput {
    enabled?: boolean;
    type?: string;
    category?: string;
    platformCategory?: string;
}

// Device-related GraphQL types
export interface DeviceFilterInput {
    statuses?: DeviceStatus[];
    deviceTypes?: DeviceType[];
    osTypes?: string[];
    organizationIds?: string[];
    tagNames?: string[];
}

export interface PaginationInput {
    page: number;
    pageSize: number;
}

export interface DeviceFilterOption {
    value: string;
    count: number;
}

export interface TagFilterOption {
    value: string;
    label: string;
    count: number;
}

export interface DeviceFilters {
    statuses: DeviceFilterOption[];
    deviceTypes: DeviceFilterOption[];
    osTypes: DeviceFilterOption[];
    organizationIds: DeviceFilterOption[];
    tags: TagFilterOption[];
    filteredCount: number;
}

export interface Tag {
    id: string;
    name: string;
    description?: string;
    color?: string;
    organizationId: string;
    createdAt: string;
    createdBy: string;
}

export interface Machine {
    id: string;
    machineId: string;
    hostname?: string;
    displayName?: string;
    ip?: string;
    macAddress?: string;
    osUuid?: string;
    agentVersion?: string;
    status: DeviceStatus;
    lastSeen?: string;
    organizationId: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    type: DeviceType;
    osType?: string;
    osVersion?: string;
    osBuild?: string;
    timezone?: string;
    registeredAt: string;
    updatedAt: string;
    tags: Tag[];
}

export interface DeviceEdge {
    node: Machine;
    cursor: string;
}

export interface CursorPageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
}

export interface PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    currentPage: number;
    totalPages: number;
}

export interface DeviceConnection {
    edges: DeviceEdge[];
    pageInfo: CursorPageInfo;
    filteredCount: number;
}

// Log-related GraphQL types
export interface LogFilterInput {
    startDate?: string;
    endDate?: string;
    eventType?: string;
    toolType?: string;
    severity?: string;
    userId?: string;
    deviceId?: string;
}

export interface LogEvent {
    toolEventId: string;
    eventType: string;
    ingestDay: string;
    toolType: string;
    severity: string;
    userId?: string;
    deviceId?: string;
    summary?: string;
    timestamp: string;
}

export interface LogEdge {
    node: LogEvent;
    cursor: string;
}

export interface LogPageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
}

export interface LogConnection {
    edges: LogEdge[];
    pageInfo: LogPageInfo;
}

export interface LogFilters {
    toolTypes: string[];
    eventTypes: string[];
    severities: string[];
}

export interface LogDetails {
    toolEventId: string;
    eventType: string;
    ingestDay: string;
    toolType: string;
    severity: string;
    userId?: string;
    deviceId?: string;
    message?: string;
    timestamp: string;
    details?: string;
} 