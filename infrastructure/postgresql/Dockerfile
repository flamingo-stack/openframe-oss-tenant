FROM postgres:15

# Required ARGs for environment variables
ARG POSTGRES_USER
ARG POSTGRES_PASSWORD
ARG POSTGRES_MULTIPLE_DATABASES
ARG POSTGRES_DB

# Install required packages
RUN apt-get update && apt-get install -y \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create all required directories with proper ownership and permissions
RUN mkdir -p /var/lib/postgresql/data/pgdata && \
    mkdir -p /var/lib/postgresql/.init-flags && \
    mkdir -p /docker-entrypoint-initdb.d && \
    chown -R postgres:postgres /var/lib/postgresql && \
    chown -R postgres:postgres /docker-entrypoint-initdb.d && \
    chmod -R 700 /var/lib/postgresql/data/pgdata && \
    chmod -R 700 /var/lib/postgresql/.init-flags

# Copy initialization scripts and configuration files
COPY --chown=postgres:postgres init-scripts/tactical-init.sql.template /docker-entrypoint-initdb.d/
COPY --chown=postgres:postgres docker-entrypoint-wrapper.sh /usr/local/bin/
COPY --chown=postgres:postgres postgresql.conf /etc/postgresql/postgresql.conf
COPY --chown=postgres:postgres pg_hba.conf /etc/postgresql/pg_hba.conf

# Set proper permissions for the scripts
RUN chmod 755 /usr/local/bin/docker-entrypoint-wrapper.sh && \
    chmod 644 /docker-entrypoint-initdb.d/tactical-init.sql.template && \
    chmod 644 /etc/postgresql/postgresql.conf && \
    chmod 644 /etc/postgresql/pg_hba.conf

# Set environment variables
ENV PGDATA=/var/lib/postgresql/data/pgdata

# Switch to postgres user
USER postgres

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-wrapper.sh"]
CMD ["postgres"]
