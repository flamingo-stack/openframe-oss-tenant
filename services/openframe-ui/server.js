import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create runtime config object from environment variables
const runtimeConfig = {
  apiUrl: process.env.API_URL || window.__RUNTIME_CONFIG__.apiUrl,
  gatewayUrl: process.env.GATEWAY_URL || window.__RUNTIME_CONFIG__.gatewayUrl,
  clientId: process.env.CLIENT_ID || window.__RUNTIME_CONFIG__.clientId,
  clientSecret: process.env.CLIENT_SECRET || window.__RUNTIME_CONFIG__.clientSecret
};

// Function to replace template variables
function replaceTemplateVariables(html) {
  console.log('Original HTML:', html);
  const replaced = html
    .replace(/<%= VITE_API_URL \|\| API_URL %>/g, runtimeConfig.apiUrl)
    .replace(/<%= VITE_GATEWAY_URL \|\| GATEWAY_URL %>/g, runtimeConfig.gatewayUrl)
    .replace(/<%= VITE_CLIENT_ID \|\| CLIENT_ID %>/g, runtimeConfig.clientId)
    .replace(/<%= VITE_CLIENT_SECRET \|\| CLIENT_SECRET %>/g, runtimeConfig.clientSecret);
  console.log('Replaced HTML:', replaced);
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