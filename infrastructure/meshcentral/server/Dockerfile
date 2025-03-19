FROM node:20-alpine

ARG MESH_TEMP_DIR=/tmp/mesh
ENV MESH_TEMP_DIR=${MESH_TEMP_DIR}
ENV MESH_DIR=/opt/meshcentral

RUN mkdir -p ${MESH_TEMP_DIR} ${MESH_DIR}

WORKDIR ${MESH_TEMP_DIR}

RUN apk add --no-cache bash git redis mongodb-tools curl gnupg gettext postgresql-client nginx

RUN npm update -g npm

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

COPY meshcentral-functions.sh /
RUN chmod +x /meshcentral-functions.sh

COPY nginx.conf.template /

COPY config.json ${MESH_TEMP_DIR}

RUN chown -R node:node ${MESH_TEMP_DIR} ${MESH_DIR}

USER node

ENTRYPOINT [ "/entrypoint.sh" ]