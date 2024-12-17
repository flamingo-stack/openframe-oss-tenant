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
  credentials?: {
    username?: string;
    password?: string;
  };
} 