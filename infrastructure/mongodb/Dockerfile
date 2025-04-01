FROM mongo:7.0-jammy

# Install required packages
RUN apt-get update && apt-get install -y \
    netcat \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create MongoDB directories with proper permissions
RUN mkdir -p /data/db /data/configdb /data/db/journal /data/db/diagnostic.data && \
    chown -R mongodb:mongodb /data && \
    chmod -R 770 /data

# Copy initialization scripts
COPY mongo-init.js.template /docker-entrypoint-initdb.d/
COPY docker-entrypoint-wrapper.sh /usr/local/bin/

# Set proper permissions for the scripts
RUN chmod 755 /usr/local/bin/docker-entrypoint-wrapper.sh && \
    chown mongodb:mongodb /docker-entrypoint-initdb.d/mongo-init.js.template && \
    chown mongodb:mongodb /usr/local/bin/docker-entrypoint-wrapper.sh

# Create directory for initialization flag
RUN mkdir -p /data/db/.mongodb && \
    chown -R mongodb:mongodb /data/db/.mongodb && \
    chmod -R 770 /data/db/.mongodb

# Create log directory with proper permissions
RUN mkdir -p /var/log/mongodb && \
    chown -R mongodb:mongodb /var/log/mongodb && \
    chmod -R 770 /var/log/mongodb

# Switch to mongodb user
USER mongodb

# Set the entrypoint to our wrapper script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-wrapper.sh"]
CMD ["mongod", "--bind_ip_all", "--auth"]
