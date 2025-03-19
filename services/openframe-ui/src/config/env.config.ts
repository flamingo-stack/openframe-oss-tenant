export const config = {
  API_URL: import.meta.env.VITE_API_URL || import.meta.env.API_URL || 'http://localhost:8090',
  GATEWAY_URL: import.meta.env.VITE_GATEWAY_URL || import.meta.env.GATEWAY_URL || 'http://localhost:8100'
}; 