FROM node:21-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

ARG PORT
ENV PORT=${PORT:-3000}

# Expose the port the app runs on
EXPOSE ${PORT}

# Start the application in development mode
CMD npm run dev -- --port $PORT
