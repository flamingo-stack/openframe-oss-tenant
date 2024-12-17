export interface IntegratedTool {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  url?: string;
  enabled: boolean;
  type: string;
  port?: string;
  category?: string;
  platformCategory?: string;
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
} 