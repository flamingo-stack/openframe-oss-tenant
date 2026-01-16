FROM --platform=$BUILDPLATFORM fleetdm/fleet:v4.78.0

# Metadata
LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

USER root

# Set Fleet environment variables as build arguments
ARG FLEET_CONFIG
ARG FLEET_SETUP_ADMIN_EMAIL
ARG FLEET_SETUP_ADMIN_PASSWORD
ARG FLEET_SETUP_ORG_NAME
ARG FLEET_SETUP_AUTO_INIT
ARG FLEET_MYSQL_ADDRESS
ARG FLEET_MYSQL_DATABASE
ARG FLEET_MYSQL_USERNAME
ARG FLEET_MYSQL_PASSWORD
ARG FLEET_REDIS_ADDRESS
ARG FLEET_AUTH_JWT_KEY
ARG FLEET_ENROLL_SECRET
ARG FLEET_API_USER_NAME
ARG FLEET_API_USER_EMAIL
ARG FLEET_API_USER_PASSWORD
ARG FLEET_SERVER_PORT
ARG FLEET_SETUP_ADMIN_NAME

# Set them as environment variables
ENV FLEET_CONFIG=${FLEET_CONFIG} \
    FLEET_SETUP_ADMIN_EMAIL=${FLEET_SETUP_ADMIN_EMAIL} \
    FLEET_SETUP_ADMIN_PASSWORD=${FLEET_SETUP_ADMIN_PASSWORD} \
    FLEET_SETUP_ORG_NAME=${FLEET_SETUP_ORG_NAME} \
    FLEET_SETUP_AUTO_INIT=${FLEET_SETUP_AUTO_INIT} \
    FLEET_MYSQL_ADDRESS=${FLEET_MYSQL_ADDRESS} \
    FLEET_MYSQL_DATABASE=${FLEET_MYSQL_DATABASE} \
    FLEET_MYSQL_USERNAME=${FLEET_MYSQL_USERNAME} \
    FLEET_MYSQL_PASSWORD=${FLEET_MYSQL_PASSWORD} \
    FLEET_REDIS_ADDRESS=${FLEET_REDIS_ADDRESS} \
    FLEET_AUTH_JWT_KEY=${FLEET_AUTH_JWT_KEY} \
    FLEET_ENROLL_SECRET=${FLEET_ENROLL_SECRET} \
    FLEET_API_USER_NAME=${FLEET_API_USER_NAME} \
    FLEET_API_USER_EMAIL=${FLEET_API_USER_EMAIL} \
    FLEET_API_USER_PASSWORD=${FLEET_API_USER_PASSWORD} \
    FLEET_SERVER_PORT=${FLEET_SERVER_PORT} \
    FLEET_SETUP_ADMIN_NAME=${FLEET_SETUP_ADMIN_NAME}

RUN mkdir -p /usr/share /etc/fleet /var/log/osquery && \
    chmod 755 /var/log/osquery

COPY init-fleet.sh /usr/share/init-fleet.sh
COPY entrypoint.sh /entrypoint.sh
COPY fleetmdm.yml /etc/fleet/fleet.yml

RUN apk add --no-cache bind-tools curl iputils netcat-openbsd nodejs npm && rm -rf /var/cache/apk/* && \
    npm install -g fleetctl@4.60.1 && \
    chmod 777 /usr/share/init-fleet.sh && \
    chmod +x /usr/share/init-fleet.sh /entrypoint.sh

EXPOSE ${FLEET_SERVER_PORT}

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:${FLEET_SERVER_PORT}/setup || exit 1

ENTRYPOINT ["/entrypoint.sh"]
