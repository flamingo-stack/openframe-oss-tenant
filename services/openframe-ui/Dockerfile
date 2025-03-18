# Build stage
FROM node:21-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app with docker profile
RUN npm run build -- --mode docker

# Copy the configuration injection script
COPY scripts/inject-config.js /app/scripts/

# Production stage
FROM nginx:alpine

# Install Node.js
RUN apk add --no-cache nodejs

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the configuration injection script
COPY --from=build /app/scripts/inject-config.js /usr/local/bin/
RUN chmod +x /usr/local/bin/inject-config.js

# Create an entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
