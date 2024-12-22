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

## Deployment
• Use Dockerfile or docker-compose to containerize.  
• Typically hosted behind openframe-gateway or served on its own domain.
