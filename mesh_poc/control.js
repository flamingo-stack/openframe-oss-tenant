// Control WebSocket connection and processing

import { getWebSocketUrl, getOpenFrameToken } from './utils.js';
import { updateConnectionStatus, updateTunnelStatus } from './status.js';

let websocket = null;

// Enhanced WebSocket connection with proper handshake and delay
export function connectWebSocket(url) {
  const openframeToken = getOpenFrameToken();
  const bearerOpenframeToken = `Bearer ${openframeToken}`;
  
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return Promise.resolve(websocket);
  }

  const wsUrl = new URL(url);
  wsUrl.searchParams.append('authorization', bearerOpenframeToken);

  return new Promise((resolve, reject) => {
    websocket = new WebSocket(wsUrl.toString());
    
    let connectionTimeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 2000); // 2 second timeout

    websocket.onopen = function(event) {
      console.log('WebSocket connected to control.ashx:', event);
      clearTimeout(connectionTimeout);
      
      // IMPORTANT: Wait 2 seconds after control.ashx connection before allowing commands
      console.log('Control WebSocket connected, waiting 2 seconds for session establishment...');
      setTimeout(() => {
        console.log('Control session ready, can now send commands');
        resolve(websocket);
      }, 2000); // 2 second delay
    };

    websocket.onmessage = function(event) {
      console.log('Received control message:', event.data);
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error processing control message:', error);
      }
    };

    websocket.onerror = function(error) {
      console.error('Control WebSocket error:', error);
      clearTimeout(connectionTimeout);
      reject(error);
    };

    websocket.onclose = function(event) {
      console.log('Control WebSocket connection closed:', event.code, event.reason);
      clearTimeout(connectionTimeout);
      if (event.code !== 1000) {
        console.error('Control WebSocket connection was closed unexpectedly:', event.reason);
      }
      websocket = null;
      
      // Update status display when control connection closes
      updateConnectionStatus();
      updateTunnelStatus(false); // Reset tunnel status when control disconnects
    };
  });
}

// Enhanced message handler for better debugging
function handleWebSocketMessage(message) {
  console.log('Processing control message:', message);
  
  if (message.type === 'tunnel') {
    console.log('Tunnel response received:', message);
  } else {
    console.log('Non-tunnel message received:', message);
  }
}

// Get the current websocket instance
export function getWebSocket() {
  return websocket;
}

// Check if control WebSocket is connected
export function isControlConnected() {
  return websocket && websocket.readyState === WebSocket.OPEN;
}

// Close control WebSocket connection
export function closeControlWebSocket() {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
}

// Control button action - Connect to control endpoint
export async function connectToControl(nodeId) {
  try {
    console.log('Connecting to control endpoint for node:', nodeId);
    
    const wsUrl = getWebSocketUrl();
    await connectWebSocket(wsUrl);
    
    console.log('Control connection established successfully');
    
    // Update connection status
    updateConnectionStatus();
    updateTunnelStatus(false); // Reset tunnel status when establishing new control connection
    
    alert('Control connection established successfully!');
    
    return true;
    
  } catch (error) {
    console.error('Error connecting to control:', error);
    updateConnectionStatus();
    alert('Error connecting to control: ' + error.message);
    throw error;
  }
} 