# Build stage
FROM node:21-alpine as build

WORKDIR /app

# Define build arguments
ARG PORT
ARG API_URL
ARG GATEWAY_URL
ARG CLIENT_ID
ARG CLIENT_SECRET

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for build
ENV PORT=${PORT}
ENV API_URL=${API_URL}
ENV GATEWAY_URL=${GATEWAY_URL}
ENV CLIENT_ID=${CLIENT_ID}
ENV CLIENT_SECRET=${CLIENT_SECRET}

# Build the app for production
RUN npm run build -- --mode production

# Production stage
FROM node:21-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Copy server file
COPY server.js ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
