// Utility functions for MeshCentral integration

// Constants for localStorage keys
export const STORAGE_KEYS = {
  API_URL: 'apiUrl',
  OPENFRAME_TOKEN: 'openframeToken',
  AUTH_TOKEN: 'authToken',
  RELAY_AUTH_TOKEN: 'relayAuthToken'
};

// Utility function to generate UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to get API URL from input
export function getApiUrl() {
  const url = document.getElementById('apiUrl').value.trim();
  // Remove trailing slash if present
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Function to get WebSocket URL from API URL
export function getWebSocketUrl() {
  const apiUrl = getApiUrl();
  // Convert http(s):// to ws(s):// and append WebSocket path
  return apiUrl.replace(/^http/, 'ws').replace('tools/meshcentral', 'ws/tools/meshcentral') + '/api/ws/control.ashx';
}

// Function to get MeshRelay WebSocket URL
export function getMeshRelayUrl(nodeId, sessionId) {
  const apiUrl = getApiUrl();
  const baseUrl = new URL(apiUrl).hostname;
  return `wss://${baseUrl}/ws/tools/meshcentral/api/ws/meshrelay.ashx?browser=1&p=2&nodeid=${nodeId}&id=${sessionId}&auth=${getAuthToken()}`;
}

// Token management functions
export function getOpenFrameToken() {
  return document.getElementById('openframeToken').value.trim();
}

export function getAuthToken() {
  return document.getElementById('authToken').value.trim();
}

export function getRelayAuthToken() {
  return document.getElementById('relayAuthToken').value.trim();
}

// Form data persistence functions
export function saveFormData() {
  Object.values(STORAGE_KEYS).forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      localStorage.setItem(fieldId, element.value);
    }
  });
}

export function loadFormData() {
  Object.values(STORAGE_KEYS).forEach(fieldId => {
    const savedValue = localStorage.getItem(fieldId);
    const element = document.getElementById(fieldId);
    if (savedValue && element) {
      element.value = savedValue;
    }
  });
} 