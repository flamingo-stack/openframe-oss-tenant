FROM --platform=$BUILDPLATFORM mongo:7.0.18

# Metadata
LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

# Install required packages
RUN apt-get update && apt-get install -y \
    netcat \
    gettext-base \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Create MongoDB directories with proper permissions
RUN mkdir -p \
        /data/db/.mongodb \
        /data/configdb \
        /data/db/journal \
        /data/db/diagnostic.data \
        /var/log/mongodb && \
    chown -R mongodb:mongodb \
        /data \
        /var/log/mongodb && \
    chmod -R 770 \
        /data \
        /var/log/mongodb

# Copy initialization scripts
# COPY mongo-init.js.template /docker-entrypoint-initdb.d/
COPY docker-entrypoint-wrapper.sh /usr/local/bin/

# Set proper permissions for the scripts
RUN chmod 755 /usr/local/bin/docker-entrypoint-wrapper.sh && \
    chown mongodb:mongodb /usr/local/bin/docker-entrypoint-wrapper.sh

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD mongo --eval 'db.runCommand("ping").ok' localhost:27017/test --quiet || exit 1

# Switch to mongodb user
USER mongodb

# # Set the entrypoint to our wrapper script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-wrapper.sh"]

CMD ["mongod", "--bind_ip_all", "--auth"]
