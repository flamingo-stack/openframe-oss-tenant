#!/bin/bash

# Export all environment variables
set -a
[ -f /etc/environment ] && source /etc/environment
set +a

# Ensure environment variables are set
: "${POSTGRES_DB:?Required}"
: "${POSTGRES_USER:?Required}"
: "${POSTGRES_PASSWORD:?Required}"
: "${POSTGRES_HOST:=localhost}"
: "${POSTGRES_PORT:=5432}"

# Set environment variable for PostgreSQL data directory
export PGDATA=/var/lib/postgresql/data/pgdata

# Connection Settings
# if/else
listen_addresses = '*'
port = ${POSTGRES_PORT}
max_connections = 100

# Initialize PostgreSQL if needed
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    initdb --username="$POSTGRES_USER" --pwfile=<(echo "$POSTGRES_PASSWORD") \
           --auth=trust --auth-local=trust \
           --encoding=UTF8 --locale=en_US.UTF-8 \
           -D "$PGDATA"

    # Configure PostgreSQL
    cat > "$PGDATA/postgresql.conf" << EOL

    echo "First time initialization..."

    # Start PostgreSQL temporarily for initialization
    pg_ctl -D "$PGDATA" -w start

    # Create database and initialize if not already done
    if [ ! -f "/var/lib/postgresql/.init-flags/db_initialized" ]; then
        echo "Creating database..."
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
            -- Drop database if exists
            DROP DATABASE IF EXISTS $POSTGRES_DB;
            
            -- Create tacticalrmm user if not exists
            DO \$\$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tacticalrmm') THEN
                    CREATE USER tacticalrmm WITH PASSWORD '$POSTGRES_PASSWORD';
                END IF;
            END
            \$\$;
            
            -- Create database
            CREATE DATABASE $POSTGRES_DB;
            
            -- Grant necessary permissions
            GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO tacticalrmm;
            GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOSQL

        # Now connect to the new database and set up schema
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
            -- Create extensions
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "hstore";
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
            
            -- Create schema and set permissions
            CREATE SCHEMA IF NOT EXISTS public;
            ALTER SCHEMA public OWNER TO tacticalrmm;
            GRANT ALL ON SCHEMA public TO tacticalrmm;
            GRANT ALL ON SCHEMA public TO $POSTGRES_USER;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tacticalrmm;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tacticalrmm;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO tacticalrmm;
EOSQL

        # Process the SQL template
        echo "Processing SQL template..."
        cd /docker-entrypoint-initdb.d
        if [ -f "tactical-init.sql.template" ]; then
            envsubst < tactical-init.sql.template > tactical-init.sql
            echo "Running tactical initialization script..."
            # Connect as postgres user to create schema objects
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f tactical-init.sql
        else
            echo "Error: tactical-init.sql.template not found in /docker-entrypoint-initdb.d"
            exit 1
        fi

        touch "/var/lib/postgresql/.init-flags/db_initialized"
        echo "Database initialization completed."
    fi

    # Stop PostgreSQL after initialization
    pg_ctl -D "$PGDATA" -m fast -w stop
fi

# Start PostgreSQL with direct stderr logging
exec postgres -D "$PGDATA" -c logging_collector=off -c log_destination=stderr
