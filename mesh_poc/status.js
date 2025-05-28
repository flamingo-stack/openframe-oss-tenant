// Status management and UI updates

import { isControlConnected } from './control.js';
import { isRelayConnected } from './relay.js';

// Global state for current session
export let currentSessionId = null;
export let currentNodeId = null;

// Function to set current session information
export function setCurrentSession(nodeId, sessionId) {
  currentNodeId = nodeId;
  currentSessionId = sessionId;
}

// Function to get current session information
export function getCurrentSession() {
  return {
    nodeId: currentNodeId,
    sessionId: currentSessionId
  };
}

// Function to clear current session
export function clearCurrentSession() {
  currentNodeId = null;
  currentSessionId = null;
}

// Status update functions
export function updateConnectionStatus() {
  const statusDiv = document.getElementById('connectionStatus');
  if (statusDiv) {
    statusDiv.style.display = 'block';
  }
  
  // Update current node
  const currentNodeDisplay = document.getElementById('currentNodeDisplay');
  if (currentNodeDisplay) {
    currentNodeDisplay.textContent = currentNodeId || 'None';
  }
  
  // Update session ID
  const sessionIdDisplay = document.getElementById('sessionIdDisplay');
  if (sessionIdDisplay) {
    sessionIdDisplay.textContent = currentSessionId || 'None';
  }
  
  // Update control status
  const controlStatus = document.getElementById('controlStatus');
  if (controlStatus) {
    if (isControlConnected()) {
      controlStatus.textContent = 'Connected';
      controlStatus.className = 'connected';
    } else {
      controlStatus.textContent = 'Disconnected';
      controlStatus.className = 'disconnected';
    }
  }
  
  // Update relay status
  const relayStatus = document.getElementById('relayStatus');
  if (relayStatus) {
    if (isRelayConnected()) {
      relayStatus.textContent = 'Connected';
      relayStatus.className = 'connected';
    } else {
      relayStatus.textContent = 'Disconnected';
      relayStatus.className = 'disconnected';
    }
  }
}

export function updateTunnelStatus(sent = false) {
  const tunnelStatus = document.getElementById('tunnelStatus');
  if (tunnelStatus) {
    if (sent) {
      tunnelStatus.textContent = 'Sent';
      tunnelStatus.className = 'sent';
    } else {
      tunnelStatus.textContent = 'Not Sent';
      tunnelStatus.className = 'not-sent';
    }
  }
} 