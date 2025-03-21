# OpenFrame UI

OpenFrame UI is the front-end dashboard for managing integrated tools, visualizing system status, and interacting with OpenFrame’s microservices.

## Structure
• package.json: Defines dependencies (Vue, React, or your chosen framework), plus scripts for dev/build.  
• Tools.vue: Main page showing the list of integrated tools.  
• ToolIcons.ts: Maps tool IDs to icons.  

## Development
1. Install dependencies:  
   » npm install  
2. Run in dev mode:  
   » npm run dev  
3. Build production assets:  
   » npm run build  

## Key Features
• Displays information on each integrated tool (e.g., openframe-api, openframe-gateway, Kafka, etc.).  
• Offers quick links for controlling services or copying connection URLs.  
• Represents the “visual hub” for operators or admins in an OpenFrame deployment.

## Configuration
• .env.* files: Store environment-specific settings (API URLs, client secrets, etc.).  
• Tools can be dynamically loaded if your backend (GraphQL or REST) provides metadata.

### Environment Setup
Create a `.env` file in the project root with the following variables:

```env
VITE_API_URL=http://localhost:8090
VITE_GATEWAY_URL=http://localhost:8100
VITE_CLIENT_ID=your-client-id
VITE_CLIENT_SECRET=your-client-secret
VITE_GRAFANA_URL=http://localhost:3000
```

These environment variables are required for the application to function properly. Without them, the application will not initialize correctly and navigation features may not work.

For local development, you can also run the application with environment variables directly:

```bash
PORT=5177 VITE_API_URL=http://localhost:8090 VITE_GATEWAY_URL=http://localhost:8100 VITE_CLIENT_ID=openframe_web_dashboard VITE_CLIENT_SECRET=prod_secret VITE_GRAFANA_URL=http://localhost:3000 npm run dev
```

## Testing
• npm run test – Runs unit tests (e.g., with Jest or Vitest).  
• npm run e2e – (Optional) End-to-end tests with Cypress or similar.

## Deployment
• Use Dockerfile or docker-compose to containerize.  
• Typically hosted behind openframe-gateway or served on its own domain.  
• For production, ensure environment variables (like VITE_API_URL) point to correct backend services.
