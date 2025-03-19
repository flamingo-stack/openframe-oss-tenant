import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create runtime config object from environment variables
const runtimeConfig = {
  apiUrl: process.env.VITE_API_URL,
  gatewayUrl: process.env.VITE_GATEWAY_URL,
  clientId: process.env.VITE_CLIENT_ID,
  clientSecret: process.env.VITE_CLIENT_SECRET,
  grafanaUrl: process.env.VITE_GRAFANA_URL
};

// Log environment variables for debugging
console.log('🔍 [Server] Environment variables:', {
  VITE_API_URL: process.env.VITE_API_URL,
  VITE_GATEWAY_URL: process.env.VITE_GATEWAY_URL,
  VITE_CLIENT_ID: process.env.VITE_CLIENT_ID,
  VITE_CLIENT_SECRET: process.env.VITE_CLIENT_SECRET ? '***' : undefined,
  VITE_GRAFANA_URL: process.env.VITE_GRAFANA_URL
});

// Function to replace template variables
function replaceTemplateVariables(html) {
  console.log('🔍 [Server] Replacing template variables with:', {
    apiUrl: runtimeConfig.apiUrl,
    gatewayUrl: runtimeConfig.gatewayUrl,
    clientId: runtimeConfig.clientId,
    clientSecret: runtimeConfig.clientSecret ? '***' : undefined,
    grafanaUrl: runtimeConfig.grafanaUrl
  });

  const replaced = html
    .replace(/<%= VITE_API_URL %>/g, runtimeConfig.apiUrl)
    .replace(/<%= VITE_GATEWAY_URL %>/g, runtimeConfig.gatewayUrl)
    .replace(/<%= VITE_CLIENT_ID %>/g, runtimeConfig.clientId)
    .replace(/<%= VITE_CLIENT_SECRET %>/g, runtimeConfig.clientSecret)
    .replace(/<%= VITE_GRAFANA_URL %>/g, runtimeConfig.grafanaUrl);

  return replaced;
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes
app.get('*', async (req, res) => {
  try {
    // Read the index.html file
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Reading index.html from:', indexPath);
    const html = await fs.readFile(indexPath, 'utf8');
    console.log('Successfully read index.html');

    // Replace template variables and inject runtime config
    const modifiedHtml = replaceTemplateVariables(html);

    // Send the modified HTML
    res.send(modifiedHtml);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Runtime configuration:', runtimeConfig);
});