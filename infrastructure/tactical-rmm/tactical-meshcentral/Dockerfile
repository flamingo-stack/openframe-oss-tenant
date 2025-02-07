FROM node:18.19.0-alpine3.18

WORKDIR /opt/meshcentral

# Install required packages
RUN apk add --no-cache bash python3 make g++ git

# Copy configuration and entrypoint
COPY config.json /opt/meshcentral/
COPY entrypoint.sh /

# Install MeshCentral
RUN npm install meshcentral@1.1.15 \
    && npm cache clean --force \
    && chown -R node:node /opt/meshcentral \
    && chmod +x /entrypoint.sh

USER node

ENTRYPOINT ["/entrypoint.sh"] 
