export interface ToolCredentials {
  username?: string;
  password?: string;
  token?: string;
}

export interface IntegratedTool {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  url?: string;
  port?: string;
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