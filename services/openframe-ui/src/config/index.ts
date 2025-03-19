import { ref } from 'vue';
import { ConfigService } from './config.service';

const configService = ConfigService.getInstance();
const configRef = configService.getConfigRef();

// Create reactive refs for the config values
export const API_URL = ref(import.meta.env.VITE_API_URL);
export const GATEWAY_URL = ref(import.meta.env.VITE_GATEWAY_URL);
export const CLIENT_ID = ref(import.meta.env.VITE_CLIENT_ID);
export const CLIENT_SECRET = ref(import.meta.env.VITE_CLIENT_SECRET);

// Update the refs when config changes
configRef.value = {
  apiUrl: API_URL.value,
  gatewayUrl: GATEWAY_URL.value,
  clientId: CLIENT_ID.value,
  clientSecret: CLIENT_SECRET.value
}; 