#!/bin/bash

set -e

# Get the local IP address
IP=$(hostname -I | awk '{print $1}')
DOMAIN="$IP.nip.io"

# Create docker-compose.yml
cat > /tmp/docker-compose.yml <<EOF
version: '3.8'

networks:
  registry_network:
    driver: bridge
# volumes:
#   registry_data:

services:
  registry:
    image: registry:2
    container_name: registry
    restart: always
    # ports:
    #   - "5000:5000"
    environment:
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /var/lib/registry
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Origin: '[http://$DOMAIN:5000]'
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Methods: '[HEAD,GET,OPTIONS,DELETE]'
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Credentials: '[true]'
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Headers: '[Authorization,Accept,Cache-Control]'
      REGISTRY_HTTP_HEADERS_Access-Control-Expose-Headers: '[Docker-Content-Digest]'
      REGISTRY_STORAGE_DELETE_ENABLED: 'true'
    # volumes:
    #   - registry_data:/var/lib/registry
    networks:
      - registry_network

  registry-ui:
    image: joxit/docker-registry-ui:latest
    container_name: registry-ui
    restart: always
    ports:
      - "5000:80"
    environment:
      - REGISTRY_TITLE=Docker Registry UI
      - NGINX_PROXY_PASS_URL=http://registry:5000
      - SINGLE_REGISTRY=true
      - DELETE_IMAGES=true
      - SHOW_CONTENT_DIGEST=true
      - SHOW_CATALOG_NB_TAGS=true
      - CATALOG_MIN_BRANCHES=1
      - CATALOG_MAX_BRANCHES=1
      - TAGLIST_PAGE_SIZE=100
      - REGISTRY_SECURED=false
      - CATALOG_ELEMENTS_LIMIT=1000
    depends_on:
      - registry
    networks:
      - registry_network
EOF

# Start the services
docker-compose -f /tmp/docker-compose.yml up -d

echo "Docker Registry is running at http://$DOMAIN:5000"
echo "Registry UI is accessible at http://$DOMAIN:8080"
