# Build stage
FROM node:21-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app for production
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

EXPOSE 80

# The entrypoint script should run inject-config.js before starting nginx
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
