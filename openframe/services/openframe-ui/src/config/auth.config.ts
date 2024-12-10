interface AuthConfig {
  clientId: string;
  clientSecret: string;
}

const isDev = import.meta.env.DEV;

const authConfig: AuthConfig = {
  clientId: isDev ? 'openframe_web_dashboard_dev' : 'openframe_web_dashboard',
  clientSecret: isDev ? 'dev_secret' : import.meta.env.VITE_CLIENT_SECRET
};

export default authConfig; 