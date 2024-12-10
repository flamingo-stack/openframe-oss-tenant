FROM fleetdm/fleet:v4.60.1

USER root

RUN apk update && \
    apk add --no-cache \
    curl \
    npm \
    bash \
    netcat-openbsd

RUN npm install -g fleetctl@4.60.1

# Create necessary directories
RUN mkdir -p /etc/fleet \
    /var/log/osquery && \
    chmod 755 /var/log/osquery

COPY fleet.yml /etc/fleet/fleet.yml
COPY init-fleet.sh /init-fleet.sh
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /init-fleet.sh /entrypoint.sh && \
    chmod 644 /etc/fleet/fleet.yml

ENTRYPOINT ["/entrypoint.sh"]