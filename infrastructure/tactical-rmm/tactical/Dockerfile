FROM python:3.11-slim

# Set environment variables
ENV TACTICAL_DIR /opt/tactical
ENV TACTICAL_USER tactical
ENV TACTICAL_USER_ID 1000
ENV TACTICAL_TMP_DIR /tmp/tactical
ENV TACTICAL_READY_FILE /tmp/tactical-ready

# Create tactical user
RUN groupadd -g ${TACTICAL_USER_ID} ${TACTICAL_USER} && \
    useradd -u ${TACTICAL_USER_ID} -g ${TACTICAL_USER} -m -s /bin/bash ${TACTICAL_USER}

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    build-essential \
    libpq-dev \
    python3-venv \
    supervisor \
    rsync \
    netcat-traditional \
    python3-tldextract \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Clone TacticalRMM repository and setup
RUN git clone https://github.com/amidaware/tacticalrmm.git /tmp/tacticalrmm && \
    cp -r /tmp/tacticalrmm/api/* /app/ && \
    mkdir -p ${TACTICAL_DIR}/api && \
    cp -r /tmp/tacticalrmm/api/* ${TACTICAL_DIR}/api/ && \
    cp /tmp/tacticalrmm/api/tacticalrmm/requirements.txt /app/ && \
    rm -rf /tmp/tacticalrmm

# Clone community scripts
RUN git clone https://github.com/amidaware/community-scripts.git ${TACTICAL_DIR}/community-scripts

# Install Python dependencies in virtual environment
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir supervisor uwsgi uvicorn

# Create necessary directories and set permissions
RUN mkdir -p \
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
        /redis \
        /app && \
    chmod -R 755 \
        ${TACTICAL_DIR} \
        ${TACTICAL_TMP_DIR} \
        /meshcentral-data \
        /mongo \
        /redis

WORKDIR ${TACTICAL_DIR}/api

EXPOSE 8080

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && \
    chown ${TACTICAL_USER}:${TACTICAL_USER} /entrypoint.sh

USER ${TACTICAL_USER}

ENTRYPOINT ["/entrypoint.sh"]
