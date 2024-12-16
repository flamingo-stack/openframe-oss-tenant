FROM fleetdm/fleet:v4.60.1

USER root

RUN mkdir -p /bin/init-fleet /etc/fleet /var/log/osquery && \
    chmod 755 /var/log/osquery

COPY init.sh /bin/init-fleet/init.sh
COPY entrypoint.sh /entrypoint.sh
COPY fleet.yml /etc/fleet/fleet.yml

RUN apk add --no-cache bind-tools curl iputils netcat-openbsd nodejs npm && \
    npm install -g fleetctl@4.60.1 && \
    chmod +x /bin/init-fleet/init.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]