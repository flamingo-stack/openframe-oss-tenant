import { ConfigService } from './config.service';

interface AuthConfig {
  clientId: string;
  clientSecret: string;
}

const configService = ConfigService.getInstance();
const config = configService.getConfig();

const authConfig: AuthConfig = {
  clientId: config.clientId,
  clientSecret: config.clientSecret
};

export { authConfig }; 