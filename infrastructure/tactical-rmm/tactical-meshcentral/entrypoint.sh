#!/bin/sh

# Create a copy of the original config file
cp /opt/meshcentral/config.json /opt/meshcentral/config.json.template

# Replace environment variables
sed -i "s/\${MONGO_USER}/${MONGO_USER}/g" /opt/meshcentral/config.json.template
sed -i "s/\${MONGO_PASSWORD}/${MONGO_PASSWORD}/g" /opt/meshcentral/config.json.template
sed -i "s/\${MONGO_HOST}/${MONGO_HOST}/g" /opt/meshcentral/config.json.template
sed -i "s/\${MONGO_PORT}/${MONGO_PORT}/g" /opt/meshcentral/config.json.template

# Move the processed template to the final location
mv /opt/meshcentral/config.json.template /opt/meshcentral/config.json

# Start MeshCentral
cd /opt/meshcentral
exec node node_modules/meshcentral
