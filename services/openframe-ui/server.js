import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const env = {
  API_URL: process.env.VITE_API_URL,
  GATEWAY_URL: process.env.VITE_GATEWAY_URL,
  CLIENT_ID: process.env.VITE_CLIENT_ID,
  CLIENT_SECRET: process.env.VITE_CLIENT_SECRET,
  PORT: process.env.PORT || '3000'
};

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = parseInt(env.PORT);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment Variables:', {
    apiUrl: env.API_URL,
    gatewayUrl: env.GATEWAY_URL,
    clientId: env.CLIENT_ID,
    clientSecret: '***'
  });
}); 