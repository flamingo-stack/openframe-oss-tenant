FROM fleetdm/fleet:v4.60.1

USER root

RUN mkdir -p /usr/share /etc/fleet /var/log/osquery && \
    chmod 755 /var/log/osquery

COPY init-fleet.sh /usr/share/init-fleet.sh
COPY entrypoint.sh /entrypoint.sh
COPY fleet.yml /etc/fleet/fleet.yml

RUN apk add --no-cache bind-tools curl iputils netcat-openbsd nodejs npm && \
    npm install -g fleetctl@4.60.1 && \
    chmod 777 /usr/share/init-fleet.sh && \
    chmod +x /usr/share/init-fleet.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]