# creates python virtual env
FROM python:3.11.8-slim AS CREATE_VENV_STAGE

ARG DEBIAN_FRONTEND=noninteractive

# set env variables
ENV VIRTUAL_ENV /opt/venv
ENV TACTICAL_DIR /opt/tactical
ENV TACTICAL_TMP_DIR /tmp/tactical
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH "${VIRTUAL_ENV}/bin:$PATH"

SHELL ["/bin/bash", "-e", "-o", "pipefail", "-c"]

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libc6-dev git && \
    git clone https://github.com/amidaware/tacticalrmm.git /tmp/tacticalrmm && \
    cp /tmp/tacticalrmm/api/tacticalrmm/requirements.txt ${TACTICAL_TMP_DIR}/api/requirements.txt && \
    pip install --upgrade pip && \
    pip install --no-cache-dir setuptools wheel && \
    pip install --no-cache-dir -r ${TACTICAL_TMP_DIR}/api/requirements.txt && \
    pip install --no-cache-dir supervisor uwsgi uvicorn

# pulls community scripts from git repo
FROM python:3.11.8-slim AS GET_SCRIPTS_STAGE

RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    git clone https://github.com/amidaware/community-scripts.git /community-scripts

# runtime image
FROM python:3.11.8-slim

# set env variables
ENV VIRTUAL_ENV /opt/venv
ENV TACTICAL_DIR /opt/tactical
ENV TACTICAL_TMP_DIR /tmp/tactical
ENV TACTICAL_READY_FILE ${TACTICAL_DIR}/tmp/tactical.ready
ENV TACTICAL_USER tactical
ENV PATH "${VIRTUAL_ENV}/bin:$PATH"

# copy files from repo
RUN git clone https://github.com/amidaware/tacticalrmm.git /tmp/tacticalrmm && \
    mkdir -p ${TACTICAL_TMP_DIR}/api && \
    cp -r /tmp/tacticalrmm/api/* ${TACTICAL_TMP_DIR}/api/ && \
    rm -rf /tmp/tacticalrmm

# copy community scripts and virtual env from build stages
COPY --from=GET_SCRIPTS_STAGE /community-scripts ${TACTICAL_TMP_DIR}/community-scripts
COPY --from=CREATE_VENV_STAGE ${VIRTUAL_ENV} ${VIRTUAL_ENV}

# install deps
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends rsync weasyprint && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1000 "${TACTICAL_USER}" && \
    useradd -M -d "${TACTICAL_DIR}" -s /bin/bash -u 1000 -g 1000 "${TACTICAL_USER}" && \
    mkdir -p \
        ${TACTICAL_DIR}/tmp \
        ${TACTICAL_DIR}/api/tacticalrmm/private/exe \
        ${TACTICAL_DIR}/api/tacticalrmm/private/log \
        ${TACTICAL_DIR}/reporting \
        ${TACTICAL_DIR}/reporting/assets \
        ${TACTICAL_DIR}/certs \
        ${TACTICAL_TMP_DIR} \
        /meshcentral-data \
        /mongo/data/db \
        /redis/data && \
    touch ${TACTICAL_DIR}/api/tacticalrmm/private/log/django_debug.log && \
    touch ${TACTICAL_DIR}/tmp/.initialized && \
    touch ${TACTICAL_DIR}/certs/.initialized && \
    touch /meshcentral-data/.initialized && \
    touch /mongo/data/db/.initialized && \
    touch /redis/data/.initialized && \
    chown -R ${TACTICAL_USER}:${TACTICAL_USER} \
        ${TACTICAL_DIR} \
        ${TACTICAL_TMP_DIR} \
        /meshcentral-data \
        /mongo \
        /redis

SHELL ["/bin/bash", "-e", "-o", "pipefail", "-c"]

# docker init
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh && \
    chown ${TACTICAL_USER}:${TACTICAL_USER} /entrypoint.sh

WORKDIR ${TACTICAL_DIR}/api

EXPOSE 8080 4443 8383

ENTRYPOINT ["/entrypoint.sh"]
