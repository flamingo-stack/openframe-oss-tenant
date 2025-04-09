# Build stage
FROM node:20-alpine AS build

USER root

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git

# Clone the frontend repository and install dependencies
RUN git clone https://github.com/amidaware/tacticalrmm-web.git .

# Copy our modified websocket.ts file
COPY tactical-frontend/websocket.ts /app/src/websocket/websocket.ts
COPY tactical-frontend/env-config.js /env-config.js

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

USER root

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy the built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html/
COPY tactical-frontend/default.conf /etc/nginx/conf.d/

COPY tactical-frontend/entrypoint.sh /
RUN chmod +x /entrypoint.sh

COPY shared/common-functions.sh /
RUN chmod +x /common-functions.sh

COPY tactical-frontend/websocket.ts /app/src/websocket/websocket.ts
COPY tactical-frontend/env-config.js /env-config.js

ENTRYPOINT ["/entrypoint.sh"]
