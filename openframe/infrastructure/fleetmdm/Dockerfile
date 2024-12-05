FROM fleetdm/fleet:v4.60.0

USER root

RUN apk update && \
    apk add --no-cache \
    curl \
    npm \
    openssl \
    bash \
    su-exec \
    netcat-openbsd \
    mysql-client && \
    npm install -g fleetctl

# Create necessary directories
RUN mkdir -p /etc/fleet/certs/tls \
    /etc/fleet/certs/mdm \
    /etc/fleet/private \
    /var/log/osquery && \
    mkdir -p /etc/fleet/keys && \
    chown -R fleet:fleet /var/log/osquery && \
    chown -R fleet:fleet /etc/fleet && \
    chmod 755 /var/log/osquery

# Copy scripts and configuration
COPY setup-fleet-certs.sh /setup-fleet-certs.sh
COPY fleet-init.sh /fleet-init.sh
COPY entrypoint.sh /entrypoint.sh
COPY fleet.yml /etc/fleet/fleet.yml

# Make scripts executable and set permissions
RUN chmod +x /setup-fleet-certs.sh /fleet-init.sh /entrypoint.sh && \
    chown fleet:fleet /setup-fleet-certs.sh /fleet-init.sh /entrypoint.sh && \
    chown fleet:fleet /etc/fleet/fleet.yml && \
    chmod 644 /etc/fleet/fleet.yml

USER fleet

ENV FLEET_CONFIG=/etc/fleet/fleet.yml

ENTRYPOINT ["/entrypoint.sh"] 