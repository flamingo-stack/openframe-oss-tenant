# Build stage
FROM node:21-alpine as build

# Build-time defaults (these won't affect runtime in k8s)
ARG VITE_API_URL=http://localhost:8090
ARG VITE_GATEWAY_URL=http://localhost:8100
ARG VITE_CLIENT_ID=openframe_web_dashboard
ARG VITE_CLIENT_SECRET=prod_secret

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_CLIENT_ID=$VITE_CLIENT_ID
ENV VITE_CLIENT_SECRET=$VITE_CLIENT_SECRET

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app for production using ENV variables
RUN npm run build -- --mode production

# Production stage
FROM nginx:alpine

# Install Node.js for the config injection script
RUN apk add --no-cache nodejs

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the configuration injection script
COPY scripts/inject-config.js /usr/local/bin/
RUN chmod +x /usr/local/bin/inject-config.js

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# These environment variables will be overridden by Kubernetes
ENV VITE_API_URL=http://localhost:8090
ENV VITE_GATEWAY_URL=http://localhost:8100
ENV VITE_CLIENT_ID=openframe_web_dashboard
ENV VITE_CLIENT_SECRET=prod_secret

EXPOSE 80

# The entrypoint script should run inject-config.js before starting nginx
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
