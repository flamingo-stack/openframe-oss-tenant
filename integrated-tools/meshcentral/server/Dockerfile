FROM node:20-alpine

ARG MESH_DIR
ARG MESH_TEMP_DIR=/tmp/mesh

ENV MESH_TEMP_DIR=${MESH_TEMP_DIR}

RUN mkdir -p ${MESH_TEMP_DIR}

WORKDIR ${MESH_TEMP_DIR}

RUN apk add --no-cache bash git redis mongodb-tools curl gnupg gettext postgresql-client nginx fcgiwrap spawn-fcgi nano jq

RUN npm update -g npm

# Copy scripts and make them executable
COPY scripts/ /scripts/
RUN chmod -R +x /scripts/

# Copy configuration files
COPY nginx.conf.template /
COPY config.json ${MESH_TEMP_DIR}
 
# Copy API files and make them executable
COPY nginx-api/meshcentral-api.sh /nginx-api/
COPY nginx-api/generate-custom-msh.sh /nginx-api/
RUN chmod +x /nginx-api/meshcentral-api.sh /nginx-api/generate-custom-msh.sh

# Copy and set up entrypoint
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

RUN chown -R node:node ${MESH_TEMP_DIR}

USER node

ENTRYPOINT [ "/entrypoint.sh" ]