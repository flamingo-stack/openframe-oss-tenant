const STORAGE_KEYS = {
  API_URL: 'apiUrl',
  OPENFRAME_TOKEN: 'openframeToken',
  AUTH_COOKIE: 'authCookie',
  RELAY_AUTH_COOKIE: 'relayAuthCookie'
};

// Function to generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

// Function to save form data to localStorage
function saveFormData() {
  console.log('Saving form data...');
  Object.entries(STORAGE_KEYS).forEach(([key, fieldId]) => {
      const value = document.getElementById(fieldId).value;
      console.log(`Saving ${fieldId}:`, value);
      if (value) {
          localStorage.setItem(fieldId, value);
      }
  });
}

// Function to load form data from localStorage
function loadFormData() {
  console.log('Loading form data...');
  Object.values(STORAGE_KEYS).forEach(fieldId => {
      const value = localStorage.getItem(fieldId);
      console.log(`Loading ${fieldId}:`, value);
      if (value) {
          document.getElementById(fieldId).value = value;
      }
  });
}

// Function to clear form data from localStorage
function clearFormData() {
  console.log('Clearing form data...');
  Object.values(STORAGE_KEYS).forEach(fieldId => {
      localStorage.removeItem(fieldId);
  });
  document.getElementById('apiConfigForm').reset();
}

// Function to get OpenFrame token from input
function getOpenFrameToken() {
  return document.getElementById('openframeToken').value.trim();
}

// Function to get auth token from input
function getAuthToken() {
  return document.getElementById('authCookie').value.trim();
}

// Function to get relay auth token from input
function getRelayAuthToken() {
  return document.getElementById('relayAuthCookie').value.trim();
}