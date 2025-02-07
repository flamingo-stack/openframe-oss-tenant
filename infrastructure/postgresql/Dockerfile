FROM postgres:15

# Install required packages
RUN apt-get update && apt-get install -y \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create PostgreSQL directories with proper permissions
RUN mkdir -p /var/lib/postgresql/data/pgdata && \
    chown -R postgres:postgres /var/lib/postgresql && \
    chmod -R 700 /var/lib/postgresql/data/pgdata

# Create directory for initialization flag
RUN mkdir -p /var/lib/postgresql/.init-flags && \
    chown -R postgres:postgres /var/lib/postgresql/.init-flags && \
    chmod -R 700 /var/lib/postgresql/.init-flags

# Create initialization scripts directory
RUN mkdir -p /docker-entrypoint-initdb.d

# Copy initialization scripts
COPY init-scripts/tactical-init.sql.template /docker-entrypoint-initdb.d/
COPY docker-entrypoint-wrapper.sh /usr/local/bin/

# Set proper permissions for the scripts
RUN chmod 755 /usr/local/bin/docker-entrypoint-wrapper.sh && \
    chmod 644 /docker-entrypoint-initdb.d/tactical-init.sql.template && \
    chown -R postgres:postgres /docker-entrypoint-initdb.d/ && \
    chown postgres:postgres /usr/local/bin/docker-entrypoint-wrapper.sh

# Set environment variables
ENV PGDATA=/var/lib/postgresql/data/pgdata

# Switch to postgres user
USER postgres

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-wrapper.sh"]
CMD ["postgres"]
