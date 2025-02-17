# Build stage
FROM node:20-alpine AS build

# Set build environment variables that will be available during build time
ARG NODE_ENV=development
ARG DOCKER_BUILD=false
ARG TRMM_PROTO=http
ARG API_HOST=localhost:8000
ARG WS_PROTO=ws

ENV NODE_ENV=$NODE_ENV
ENV DOCKER_BUILD=$DOCKER_BUILD
ENV TRMM_PROTO=$TRMM_PROTO
ENV API_HOST=$API_HOST
ENV WS_PROTO=$WS_PROTO

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git

# Clone the frontend repository and install dependencies
RUN git clone https://github.com/amidaware/tacticalrmm-web.git .

# Copy our modified websocket.ts file
COPY websocket.ts /app/src/websocket/websocket.ts

RUN npm install --cache ~/.npm && \
  npm i -g @quasar/cli

# Print environment variables and build the application
RUN set -x && \
  echo "Build environment:" && \
  echo "NODE_ENV=$NODE_ENV" && \
  echo "DOCKER_BUILD=$DOCKER_BUILD" && \
  echo "TRMM_PROTO=$TRMM_PROTO" && \
  echo "API_HOST=$API_HOST" && \
  echo "WS_PROTO=$WS_PROTO" && \
  env && \
  quasar build && \
  echo "Build output:" && \
  ls -la /app/dist

# Production stage
FROM nginxinc/nginx-unprivileged:stable-alpine

# Install gettext for envsubst
USER root
RUN apk add --no-cache gettext

# Copy the built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html/
COPY default.conf /etc/nginx/conf.d/
COPY entrypoint.sh /
COPY env-config.js /

RUN chown -R nginx:nginx /usr/share/nginx/html \
  && chown -R nginx:nginx /etc/nginx/conf.d \
  && chmod +x /entrypoint.sh \
  && chown nginx:nginx /entrypoint.sh

USER nginx

ENTRYPOINT ["/entrypoint.sh"]
