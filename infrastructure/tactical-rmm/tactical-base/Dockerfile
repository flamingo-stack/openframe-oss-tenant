# creates python virtual env
FROM python:3.11.8-slim AS create_venv_stage

ARG DEBIAN_FRONTEND=noninteractive

# set env variables
ENV VIRTUAL_ENV /opt/venv
ENV TACTICAL_DIR /opt/tactical
ENV TACTICAL_TMP_DIR /tmp/tactical
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH "${VIRTUAL_ENV}/bin:$PATH"

SHELL ["/bin/bash", "-e", "-o", "pipefail", "-c"]
WORKDIR ${TACTICAL_TMP_DIR}

# Install git and build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends git gcc libc6-dev redis-tools

# Clone the repository and install dependencies
RUN git clone https://github.com/amidaware/tacticalrmm.git .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir setuptools wheel && \
    pip install --no-cache-dir -r api/tacticalrmm/requirements.txt

# pulls community scripts from git repo
FROM python:3.11.8-slim AS get_scripts_stage

RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    git clone https://github.com/amidaware/community-scripts.git /community-scripts

# runtime image
FROM python:3.11.8-slim

# set env variables
ENV VIRTUAL_ENV /opt/venv
ENV TACTICAL_DIR /opt/tactical
ENV TACTICAL_TMP_DIR /tmp/tactical
ENV TACTICAL_READY_FILE ${TACTICAL_DIR}/tmp/tactical/ready
ENV TACTICAL_USER tactical
ENV PATH "${VIRTUAL_ENV}/bin:$PATH"
ENV CUSTOM_CODE_DIR /tmp/custom_code_dir

RUN mkdir -p ${CUSTOM_CODE_DIR}

# Copy the GitHub files from build stage
COPY --from=create_venv_stage ${TACTICAL_TMP_DIR}/api/tacticalrmm ${TACTICAL_TMP_DIR}/api

# copy custom code
COPY helpers.py ${CUSTOM_CODE_DIR}/helpers.py
COPY custom_settings.py ${CUSTOM_CODE_DIR}/custom_settings.py
COPY views.py ${CUSTOM_CODE_DIR}/views.py

COPY --from=get_scripts_stage /community-scripts ${TACTICAL_TMP_DIR}/community-scripts

# copy venv from build stage
COPY --from=create_venv_stage ${VIRTUAL_ENV} ${VIRTUAL_ENV}

# install deps
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends rsync weasyprint && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1000 "${TACTICAL_USER}" && \
    useradd -M -d "${TACTICAL_DIR}" -s /bin/bash -u 1000 -g 1000 "${TACTICAL_USER}" && \
    chown -R ${TACTICAL_USER}:${TACTICAL_USER} ${CUSTOM_CODE_DIR} ${TACTICAL_TMP_DIR} && \
    chmod -R 755 ${CUSTOM_CODE_DIR} ${TACTICAL_TMP_DIR}

SHELL ["/bin/bash", "-e", "-o", "pipefail", "-c"]

RUN apt-get update && \
    apt-get install -y --no-install-recommends redis-tools && \
    rm -rf /var/lib/apt/lists/*

# docker init
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

WORKDIR ${TACTICAL_DIR}/api