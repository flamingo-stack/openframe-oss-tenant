FROM node:20-alpine

ENV TACTICAL_TEMP_DIR /tmp/tactical

RUN mkdir -p ${TACTICAL_TEMP_DIR}

WORKDIR ${TACTICAL_TEMP_DIR}

RUN apk add --no-cache bash git redis mongodb-tools curl gnupg gettext

SHELL ["/bin/bash", "-e", "-o", "pipefail", "-c"]

# Clone the repository and install dependencies
RUN git clone https://github.com/Flamingo-CX/tacticalrmm.git ${TACTICAL_TEMP_DIR}/repo

COPY tactical-meshcentral/config.json ${TACTICAL_TEMP_DIR}/

RUN MESH_VER=$(grep -o 'MESH_VER = "[^"]*"' ${TACTICAL_TEMP_DIR}/repo/api/tacticalrmm/tacticalrmm/settings.py | cut -d'"' -f 2) && \
    echo "MESH_VER is ${MESH_VER}" && \
    export MESH_VER

COPY tactical-meshcentral/package.json.template ${TACTICAL_TEMP_DIR}/

RUN envsubst < ${TACTICAL_TEMP_DIR}/package.json.template > ${TACTICAL_TEMP_DIR}/package.json

RUN rm -rf ${TACTICAL_TEMP_DIR}/package.json.template

RUN npm install

RUN chown -R node:node ${TACTICAL_TEMP_DIR}

COPY tactical-meshcentral/entrypoint.sh /
RUN chmod +x /entrypoint.sh

COPY shared/common-functions.sh /
RUN chmod +x /common-functions.sh

USER node

ENTRYPOINT [ "/entrypoint.sh" ] 