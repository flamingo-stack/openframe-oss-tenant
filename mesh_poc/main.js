// Main orchestration and event handling

import { 
  generateUUID, 
  getWebSocketUrl, 
  getMeshRelayUrl,
  STORAGE_KEYS,
  saveFormData,
  loadFormData 
} from './utils.js';
import { connectWebSocket, connectToControl, closeControlWebSocket } from './control.js';
import { sendTunnelMessage } from './tunnel.js';
import { connectToMeshRelay, closeMeshRelayWebSocket } from './relay.js';
import { 
  updateConnectionStatus, 
  updateTunnelStatus,
  setCurrentSession,
  getCurrentSession,
  clearCurrentSession 
} from './status.js';

// Updated main action handler with correct timing sequence
export async function handleAction(nodeId) {
  try {
    const wsUrl = getWebSocketUrl();
    // Generate a unique session ID for this connection
    const sessionId = generateUUID();
    console.log('Generated session ID:', sessionId);
    
    // Set current session information
    setCurrentSession(nodeId, sessionId);
    
    // Step 1: Establish control WebSocket connection and wait 2 seconds
    console.log('Step 1: Establishing control WebSocket connection...');
    await connectWebSocket(wsUrl);
    console.log('Control WebSocket ready after 2-second delay');
    
    // Step 2: Send tunnel message (no waiting for response)
    console.log('Step 2: Sending tunnel message...');
    await sendTunnelMessage(nodeId, sessionId);
    console.log('Tunnel message sent');
    
    // Step 3: Wait 2 seconds then connect to MeshRelay
    console.log('Step 3: Waiting 2 seconds before connecting to MeshRelay...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Connect directly to MeshRelay
    console.log('Step 4: Connecting to MeshRelay...');
    await connectToMeshRelay(nodeId, sessionId);
    
    console.log('Connection sequence completed successfully');
    
  } catch (error) {
    console.error('Error in connection sequence:', error);
    alert('Error establishing connection: ' + error.message);
    closeMeshRelayWebSocket();
    throw error;
  }
}

// Individual action functions for the three buttons

// 1. Control button wrapper
export async function handleControlButton(nodeId) {
  try {
    // Generate and store session ID for this node
    const sessionId = generateUUID();
    setCurrentSession(nodeId, sessionId);
    
    await connectToControl(nodeId);
    
  } catch (error) {
    console.error('Error in control button handler:', error);
  }
}

// 2. Tunnel button wrapper
export async function handleTunnelButton(nodeId) {
  try {
    const { sessionId } = getCurrentSession();
    await sendTunnelMessage(nodeId, sessionId);
    
    // Update current node if different
    setCurrentSession(nodeId, sessionId);
    
  } catch (error) {
    console.error('Error in tunnel button handler:', error);
  }
}

// 3. Relay button wrapper
export async function handleRelayButton(nodeId) {
  try {
    const { sessionId } = getCurrentSession();
    await connectToMeshRelay(nodeId, sessionId);
    
    // Update current node if different
    setCurrentSession(nodeId, sessionId);
    
  } catch (error) {
    console.error('Error in relay button handler:', error);
  }
}

// Function to disconnect all connections
export function disconnectAll() {
  console.log('Disconnecting all connections...');
  
  closeControlWebSocket();
  closeMeshRelayWebSocket();
  clearCurrentSession();
  
  updateConnectionStatus();
  updateTunnelStatus(false);
  
  console.log('All connections closed');
}

// Function to load data (for backwards compatibility)
export function loadData() {
  console.log('Loading data from form...');
  // This function can be used to trigger data reload or validation
  updateConnectionStatus();
}

// Add event listeners for form
document.addEventListener('DOMContentLoaded', function() {
  // Load saved data when the page loads
  loadFormData();

  // Add form submission handler
  const form = document.getElementById('apiConfigForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      loadData();
    });
  }

  // Add input change handlers to save data on change
  Object.values(STORAGE_KEYS).forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.addEventListener('change', saveFormData);
    }
  });

  // Initialize status display
  updateConnectionStatus();
  updateTunnelStatus(false);
});

// Export functions for global access (for backwards compatibility)
window.handleAction = handleAction;
window.handleControlButton = handleControlButton;
window.handleTunnelButton = handleTunnelButton;
window.handleRelayButton = handleRelayButton;
window.disconnectAll = disconnectAll;
window.loadData = loadData; 