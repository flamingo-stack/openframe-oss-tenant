FROM --platform=linux/arm64/v8 fleetdm/fleet:v4.60.0

USER root

RUN apk update && \
    apk add --no-cache \
    curl \
    npm \
    bash \
    su-exec \
    netcat-openbsd

RUN npm install -g fleetctl

# Create necessary directories
RUN mkdir -p /etc/fleet \
    /var/log/osquery && \
    chown -R fleet:fleet /var/log/osquery && \
    chown -R fleet:fleet /etc/fleet && \
    chmod 755 /var/log/osquery

# Copy scripts and configuration
COPY fleet-init.sh /fleet-init.sh
COPY entrypoint.sh /entrypoint.sh
COPY fleet.yml /etc/fleet/fleet.yml

# Make scripts executable and set permissions
RUN chmod +x /fleet-init.sh /entrypoint.sh && \
    chown fleet:fleet /fleet-init.sh /entrypoint.sh && \
    chown fleet:fleet /etc/fleet/fleet.yml && \
    chmod 644 /etc/fleet/fleet.yml

USER fleet

ENV FLEET_CONFIG=/etc/fleet/fleet.yml

ENTRYPOINT ["/entrypoint.sh"] 