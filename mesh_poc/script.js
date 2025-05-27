  let meshrelayWebSocket = null;  // New WebSocket connection for meshrelay
  let currentSessionId = null;    // Track current session ID
  let currentNodeId = null;       // Track current node ID

  // Constants for localStorage keys
  

  // Utility function to generate UUID
  function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      });
  }

  // Function to get API URL from input
  function getApiUrl() {
      const url = document.getElementById('apiUrl').value.trim();
      // Remove trailing slash if present
      return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  // Function to get WebSocket URL from API URL
  function getWebSocketUrl() {
      const apiUrl = getApiUrl();
      // Convert http(s):// to ws(s):// and append WebSocket path
      return apiUrl.replace(/^http/, 'ws').replace('tools/meshcentral', 'ws/tools/meshcentral') + '/api/ws/control.ashx';
  }

  // Function to get MeshRelay WebSocket URL
  function getMeshRelayUrl(nodeId, sessionId) {
      const apiUrl = getApiUrl();
      const baseUrl = new URL(apiUrl).hostname;
      return `wss://${baseUrl}/ws/tools/meshcentral/api/ws/meshrelay.ashx?browser=1&p=2&nodeid=${nodeId}&id=${sessionId}&auth=${getAuthToken()}`;
  }

  // Function to close meshrelay connection
  function closeMeshRelayWebSocket() {
      if (meshrelayWebSocket) {
          meshrelayWebSocket.close();
          meshrelayWebSocket = null;
      }
  }

  // Enhanced WebSocket connection with proper handshake and delay
  function connectWebSocket(url) {
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
          }, 2000); // 15 second timeout

          websocket.onopen = function(event) {
              console.log('WebSocket connected to control.ashx:', event);
              clearTimeout(connectionTimeout);
              
              // IMPORTANT: Wait 10 seconds after control.ashx connection before allowing commands
              console.log('Control WebSocket connected, waiting 10 seconds for session establishment...');
              setTimeout(() => {
                  console.log('Control session ready, can now send commands');
                  resolve(websocket);
              }, 2000); // 10 second delay as requested
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
              closeMeshRelayWebSocket();
              
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

  // Enhanced MeshRelay connection with better logging
  function connectMeshRelayWebSocket(meshrelayUrl) {
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

  // Simplified tunnel message sending without waiting for response
  function sendMeshRelayMessage(nodeId, sessionId) {
      const relayAuth = getRelayAuthToken();
      const meshRelayObj = {
          action: "msg",
          type: "tunnel",
          nodeid: nodeId,
          value: `*/meshrelay.ashx?p=2&nodeid=${nodeId}&id=${sessionId}&rauth=${relayAuth}`,
          usage: 2
      };

      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
          throw new Error('Control WebSocket not connected');
      }

      console.log('Sending tunnel message:', meshRelayObj);
      websocket.send(JSON.stringify(meshRelayObj));
  }

  // Updated main action handler with correct timing sequence
  async function handleAction(nodeId) {
      try {
          const wsUrl = getWebSocketUrl();
          // Generate a unique session ID for this connection
          const sessionId = generateUUID();
          console.log('Generated session ID:', sessionId);
          
          // Step 1: Establish control WebSocket connection and wait 10 seconds
          console.log('Step 1: Establishing control WebSocket connection...');
          await connectWebSocket(wsUrl);
          console.log('Control WebSocket ready after 10-second delay');
          
          // Step 2: Send tunnel message (no waiting for response)
          console.log('Step 2: Sending tunnel message...');
          sendMeshRelayMessage(nodeId, sessionId);
          console.log('Tunnel message sent');
          
          // Step 3: Wait 10 seconds then connect to MeshRelay
          console.log('Step 3: Waiting 10 seconds before connecting to MeshRelay...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 4: Connect directly to MeshRelay
          console.log('Step 4: Connecting to MeshRelay...');
          const meshrelayUrl = getMeshRelayUrl(nodeId, sessionId);
          await connectMeshRelayWebSocket(meshrelayUrl);
          
          console.log('Connection sequence completed successfully');
          
      } catch (error) {
          console.error('Error in connection sequence:', error);
          alert('Error establishing connection: ' + error.message);
          closeMeshRelayWebSocket();
          throw error;
      }
  }

  // Status update functions
  function updateConnectionStatus() {
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
          if (websocket && websocket.readyState === WebSocket.OPEN) {
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
          if (meshrelayWebSocket && meshrelayWebSocket.readyState === WebSocket.OPEN) {
              relayStatus.textContent = 'Connected';
              relayStatus.className = 'connected';
          } else {
              relayStatus.textContent = 'Disconnected';
              relayStatus.className = 'disconnected';
          }
      }
  }
  
  function updateTunnelStatus(sent = false) {
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

  // Individual action functions for the three buttons

  // 1. Control button - Connect to control endpoint
  async function connectToControl(nodeId) {
      try {
          console.log('Connecting to control endpoint for node:', nodeId);
          
          const wsUrl = getWebSocketUrl();
          await connectWebSocket(wsUrl);
          
          // Generate and store session ID for this node
          currentSessionId = generateUUID();
          currentNodeId = nodeId;
          
          console.log('Control connection established successfully');
          console.log('Session ID:', currentSessionId);
          
          // Reset tunnel status when establishing new control connection
          updateTunnelStatus(false);
          updateConnectionStatus();
          
          alert('Control connection established successfully!');
          
      } catch (error) {
          console.error('Error connecting to control:', error);
          updateConnectionStatus();
          alert('Error connecting to control: ' + error.message);
      }
  }

  // 2. Tunel button - Send tunnel message
  async function sendTunnelMessage(nodeId) {
      try {
          if (!websocket || websocket.readyState !== WebSocket.OPEN) {
              throw new Error('Control WebSocket not connected. Please connect to Control first.');
          }
          
          if (!currentSessionId) {
              throw new Error('No active session. Please connect to Control first.');
          }
          
          console.log('Sending tunnel message for node:', nodeId);
          console.log('Using session ID:', currentSessionId);
          
          sendMeshRelayMessage(nodeId, currentSessionId);
          
          // Update current node if different
          currentNodeId = nodeId;
          
          console.log('Tunnel message sent successfully');
          
          // Update tunnel status and connection status
          updateTunnelStatus(true);
          updateConnectionStatus();
          
          alert('Tunnel message sent successfully!');
          
      } catch (error) {
          console.error('Error sending tunnel message:', error);
          updateConnectionStatus();
          alert('Error sending tunnel message: ' + error.message);
      }
  }

  // 3. Relay button - Connect to mesh relay
  async function connectToMeshRelay(nodeId) {
      try {
          if (!currentSessionId) {
              throw new Error('No active session. Please connect to Control and send Tunnel message first.');
          }
          
          console.log('Connecting to mesh relay for node:', nodeId);
          console.log('Using session ID:', currentSessionId);
          
          // Wait a moment to ensure tunnel message was processed
          console.log('Waiting 2 seconds for tunnel to be ready...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const meshrelayUrl = getMeshRelayUrl(nodeId, currentSessionId);
          await connectMeshRelayWebSocket(meshrelayUrl);
          
          // Update current node if different
          currentNodeId = nodeId;
          
          console.log('Mesh relay connection established successfully');
          
          updateConnectionStatus();
          
          alert('Mesh relay connection established successfully!');
          
      } catch (error) {
          console.error('Error connecting to mesh relay:', error);
          updateConnectionStatus();
          alert('Error connecting to mesh relay: ' + error.message);
      }
  }

  // Add event listeners for form
  document.addEventListener('DOMContentLoaded', function() {
      // Load saved data when the page loads
      loadFormData();

      // Add form submission handler
      document.getElementById('apiConfigForm').addEventListener('submit', function(e) {
          e.preventDefault();
          loadData();
      });

      // Add input change handlers to save data on change
      Object.values(STORAGE_KEYS).forEach(fieldId => {
          document.getElementById(fieldId).addEventListener('change', saveFormData);
      });
  });
