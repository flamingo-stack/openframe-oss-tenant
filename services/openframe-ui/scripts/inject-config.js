#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
const config = {
  apiUrl: process.env.VITE_API_URL || 'http://localhost:8090',
  gatewayUrl: process.env.VITE_GATEWAY_URL || 'http://localhost:8100',
  clientId: process.env.VITE_CLIENT_ID || 'openframe_web_dashboard',
  clientSecret: process.env.VITE_CLIENT_SECRET || 'prod_secret'
};

// Read the index.html file
const indexPath = '/usr/share/nginx/html/index.html';
let html = fs.readFileSync(indexPath, 'utf8');

// Create the runtime config script
const runtimeConfigScript = `
  <script>
    window.__RUNTIME_CONFIG__ = ${JSON.stringify(config, null, 2)};
  </script>
`;

// Insert the script before the closing </head> tag
html = html.replace('</head>', `${runtimeConfigScript}</head>`);

// Write back to the file
fs.writeFileSync(indexPath, html);

console.log('Runtime configuration injected successfully');