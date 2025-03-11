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
}

export enum APIKeyType {
    HEADER = 'HEADER',
    BEARER_TOKEN = 'BEARER_TOKEN'
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

export interface ToolFilter {
    enabled?: boolean;
    type?: string;
    search?: string;
    category?: string;
    platformCategory?: string;
} 