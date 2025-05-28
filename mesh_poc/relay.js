// MeshRelay WebSocket connection and processing

import { getMeshRelayUrl } from './utils.js';
import { updateConnectionStatus } from './status.js';

let meshrelayWebSocket = null;

// Enhanced MeshRelay connection with better logging
export function connectMeshRelayWebSocket(meshrelayUrl) {
  if (meshrelayWebSocket && meshrelayWebSocket.readyState === WebSocket.OPEN) {
    console.log('MeshRelay WebSocket already connected');
    return Promise.resolve(meshrelayWebSocket);
  }

  console.log('Establishing MeshRelay WebSocket connection to:', meshrelayUrl);
  
  return new Promise((resolve, reject) => {
    meshrelayWebSocket = new WebSocket(meshrelayUrl);
    
    let connectionTimeout = setTimeout(() => {
      console.error('MeshRelay connection timeout');
      reject(new Error('MeshRelay connection timeout'));
    }, 2000);

    meshrelayWebSocket.onopen = function(event) {
      console.log('MeshRelay WebSocket connected successfully:', event);
      clearTimeout(connectionTimeout);
      resolve(meshrelayWebSocket);
    };

    meshrelayWebSocket.onmessage = function(event) {
      console.log('MeshRelay message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('Parsed MeshRelay message:', data);
      } catch (e) {
        console.log('Raw MeshRelay message (not JSON):', event.data);
      }
    };

    meshrelayWebSocket.onerror = function(error) {
      console.error('MeshRelay WebSocket error:', error);
      clearTimeout(connectionTimeout);
      reject(error);
    };

    meshrelayWebSocket.onclose = function(event) {
      console.log('MeshRelay WebSocket connection closed:', event.code, event.reason);
      clearTimeout(connectionTimeout);
      if (event.code !== 1000) {
        console.error('MeshRelay WebSocket connection was closed unexpectedly:', event.reason);
      }
      meshrelayWebSocket = null;
      
      // Update status display when relay connection closes
      updateConnectionStatus();
    };
  });
}

// Function to close meshrelay connection
export function closeMeshRelayWebSocket() {
  if (meshrelayWebSocket) {
    meshrelayWebSocket.close();
    meshrelayWebSocket = null;
  }
}

// Get the current meshrelay websocket instance
export function getMeshRelayWebSocket() {
  return meshrelayWebSocket;
}

// Check if MeshRelay WebSocket is connected
export function isRelayConnected() {
  return meshrelayWebSocket && meshrelayWebSocket.readyState === WebSocket.OPEN;
}

// Relay button action - Connect to mesh relay
export async function connectToMeshRelay(nodeId, sessionId) {
  try {
    if (!sessionId) {
      throw new Error('No active session. Please connect to Control and send Tunnel message first.');
    }
    
    console.log('Connecting to mesh relay for node:', nodeId);
    console.log('Using session ID:', sessionId);
    
    // Wait a moment to ensure tunnel message was processed
    console.log('Waiting 2 seconds for tunnel to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const meshrelayUrl = getMeshRelayUrl(nodeId, sessionId);
    await connectMeshRelayWebSocket(meshrelayUrl);
    
    console.log('Mesh relay connection established successfully');
    
    updateConnectionStatus();
    
    alert('Mesh relay connection established successfully!');
    
    return true;
    
  } catch (error) {
    console.error('Error connecting to mesh relay:', error);
    updateConnectionStatus();
    alert('Error connecting to mesh relay: ' + error.message);
    throw error;
  }
} 