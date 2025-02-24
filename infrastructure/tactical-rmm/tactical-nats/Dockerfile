FROM nats:2.10.22-alpine

RUN apk add --no-cache supervisor bash

SHELL ["/bin/bash", "-e", "-o", "pipefail", "-c"]

ARG TACTICAL_TMP_DIR

RUN mkdir -p ${TACTICAL_TMP_DIR} 
RUN mkdir -p /var/log/supervisor
RUN mkdir -p /etc/supervisor/conf.d

# Install git and build dependencies
RUN apk update && \
    apk add --no-cache git gcc libc-dev gettext redis

RUN mkdir -p ${TACTICAL_TMP_DIR}/tacticalrmm

RUN git clone https://github.com/amidaware/tacticalrmm.git ${TACTICAL_TMP_DIR}/tacticalrmm

RUN cp -rf ${TACTICAL_TMP_DIR}/tacticalrmm/natsapi/bin/nats-api ${TACTICAL_TMP_DIR}/

COPY tactical-nats/config_watcher.sh ${TACTICAL_TMP_DIR}/
COPY tactical-nats/supervisor.conf ${TACTICAL_TMP_DIR}

COPY tactical-nats/entrypoint.sh /
RUN chmod +x /entrypoint.sh

COPY shared/common-functions.sh /
RUN chmod +x /common-functions.sh

ENTRYPOINT [ "/entrypoint.sh" ]