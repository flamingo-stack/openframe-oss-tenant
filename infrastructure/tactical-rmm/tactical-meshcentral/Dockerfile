FROM node:20-alpine

ENV TACTICAL_TEMP_DIR /tmp/tactical

RUN mkdir -p ${TACTICAL_TEMP_DIR}

WORKDIR ${TACTICAL_TEMP_DIR}

RUN apk add --no-cache bash git redis mongodb-tools curl gnupg

SHELL ["/bin/bash", "-e", "-o", "pipefail", "-c"]

# Clone the repository and install dependencies
RUN git clone https://github.com/amidaware/tacticalrmm.git ${TACTICAL_TEMP_DIR}/repo
    
RUN MESH_VER=$(grep -o 'MESH_VER = "[^"]*"' ${TACTICAL_TEMP_DIR}/repo/api/tacticalrmm/tacticalrmm/settings.py | cut -d'"' -f 2) && \
    echo "MESH_VER is ${MESH_VER}" && \
    cat > ${TACTICAL_TEMP_DIR}/package.json <<EOF
{
  "dependencies": {
    "archiver": "7.0.1",
    "meshcentral": "${MESH_VER}",
    "mongodb": "4.13.0",
    "otplib": "10.2.3",
    "pg": "8.7.1",
    "pgtools": "0.3.2",
    "saslprep": "1.0.3"
  }
}
EOF

RUN npm install

RUN chown -R node:node ${TACTICAL_TEMP_DIR}

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

USER node

ENTRYPOINT [ "/entrypoint.sh" ] 