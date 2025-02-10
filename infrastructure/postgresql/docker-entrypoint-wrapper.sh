#!/bin/bash

# Export all environment variables
set -a
[ -f /etc/environment ] && source /etc/environment
set +a

# Ensure environment variables are set
: "${POSTGRES_USER:?Required}"
: "${POSTGRES_PASSWORD:?Required}"
: "${POSTGRES_HOST:=0.0.0.0}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:=}"
: "${POSTGRES_MULTIPLE_DATABASES:=}"

# Set environment variable for PostgreSQL data directory
export PGDATA=/var/lib/postgresql/data/pgdata

# Initialize PostgreSQL if needed
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    
    # Remove the data directory if it exists but is not initialized
    rm -rf "$PGDATA"
    
    # Create fresh data directory
    mkdir -p "$PGDATA"
    chmod 700 "$PGDATA"
    chown postgres:postgres "$PGDATA"
    
    # Initialize database
    initdb --username="$POSTGRES_USER" --pwfile=<(echo "$POSTGRES_PASSWORD") \
           --auth=trust --auth-local=trust \
           --encoding=UTF8 --locale=en_US.UTF-8 \
           -D "$PGDATA"

    echo "First time initialization..."

    # Create pg_hba.conf with permissive settings
    cat > "$PGDATA/pg_hba.conf" << EOL
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Allow connections from Docker containers
host    all             all             0.0.0.0/0             trust
host    all             all             ::/0                  trust

# Allow local connections
local   all             all                                   trust
EOL

    # Set proper permissions
    chmod 600 "$PGDATA/pg_hba.conf"
    chown postgres:postgres "$PGDATA/pg_hba.conf"

    # Copy PostgreSQL configuration file
    cp /etc/postgresql/postgresql.conf "$PGDATA/postgresql.conf"
    chmod 644 "$PGDATA/postgresql.conf"

    # Start PostgreSQL temporarily for initialization
    pg_ctl -D "$PGDATA" -w start

    # Function to create multiple databases from comma-separated list
    create_databases() {
        local database_list="$1"
        local database_array
        
        # Split comma-separated string into array
        IFS=',' read -ra database_array <<< "$database_list"
        
        for db in "${database_array[@]}"; do
            # Trim whitespace
            db=$(echo "$db" | tr -d '[:space:]')
            
            echo "Creating database: $db"
            echo "1 create database"
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
                -- Create tacticalrmm role if it doesn't exist and set password
                DO \$\$ 
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tacticalrmm') THEN
                        CREATE ROLE tacticalrmm WITH LOGIN PASSWORD '$POSTGRES_PASSWORD';
                    END IF;
                END
                \$\$;

                -- Drop database if exists
                DROP DATABASE IF EXISTS "$db";
                
                -- Create database
                CREATE DATABASE "$db";
                
                -- Grant necessary permissions
                GRANT ALL PRIVILEGES ON DATABASE "$db" TO "$POSTGRES_USER";
                GRANT ALL PRIVILEGES ON DATABASE "$db" TO tacticalrmm;

EOSQL
            echo "2 database created $db"
        done
    }

    # Create databases if not already done
    if [ ! -f "/var/lib/postgresql/.init-flags/dbs_initialized" ]; then
        echo "Creating configured databases..."
        
        # Create init-flags directory with proper permissions
        mkdir -p /var/lib/postgresql/.init-flags
        chown postgres:postgres /var/lib/postgresql/.init-flags
        chmod 700 /var/lib/postgresql/.init-flags
        
        # Create databases from POSTGRES_DB if set
        if [ ! -z "${POSTGRES_DB}" ]; then
            create_databases "${POSTGRES_DB}"
        fi
        
        # Create databases from POSTGRES_MULTIPLE_DATABASES if set
        if [ ! -z "${POSTGRES_MULTIPLE_DATABASES}" ]; then
            create_databases "${POSTGRES_MULTIPLE_DATABASES}"
        fi

        # Create flag file to indicate databases are initialized
        touch /var/lib/postgresql/.init-flags/dbs_initialized
    fi

    # Stop PostgreSQL after initialization    
    pg_ctl -D "$PGDATA" -m fast -w stop
fi

# Start PostgreSQL with direct stderr logging
exec postgres -D "$PGDATA" -c logging_collector=off -c log_destination=stderr
