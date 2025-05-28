// Tunnel message processing

import { getRelayAuthToken } from './utils.js';
import { getWebSocket, isControlConnected } from './control.js';
import { updateConnectionStatus, updateTunnelStatus } from './status.js';

// Simplified tunnel message sending without waiting for response
export function sendMeshRelayMessage(nodeId, sessionId) {
  const relayAuth = getRelayAuthToken();
  const meshRelayObj = {
    action: "msg",
    type: "tunnel",
    nodeid: nodeId,
    value: `*/meshrelay.ashx?p=2&nodeid=${nodeId}&id=${sessionId}&rauth=${relayAuth}`,
    usage: 2
  };

  const websocket = getWebSocket();
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error('Control WebSocket not connected');
  }

  console.log('Sending tunnel message:', meshRelayObj);
  websocket.send(JSON.stringify(meshRelayObj));
}

// Tunnel button action - Send tunnel message
export async function sendTunnelMessage(nodeId, sessionId) {
  try {
    if (!isControlConnected()) {
      throw new Error('Control WebSocket not connected. Please connect to Control first.');
    }
    
    if (!sessionId) {
      throw new Error('No active session. Please connect to Control first.');
    }
    
    console.log('Sending tunnel message for node:', nodeId);
    console.log('Using session ID:', sessionId);
    
    sendMeshRelayMessage(nodeId, sessionId);
    
    console.log('Tunnel message sent successfully');
    
    // Update tunnel status and connection status
    updateTunnelStatus(true);
    updateConnectionStatus();
    
    alert('Tunnel message sent successfully!');
    
    return true;
    
  } catch (error) {
    console.error('Error sending tunnel message:', error);
    updateConnectionStatus();
    alert('Error sending tunnel message: ' + error.message);
    throw error;
  }
} 