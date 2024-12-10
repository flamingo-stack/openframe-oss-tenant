#!/bin/bash

set -e

echo "Starting database initialization script"
echo "POSTGRES_MULTIPLE_DATABASES=$POSTGRES_MULTIPLE_DATABASES"
echo "POSTGRES_USER=$POSTGRES_USER"

create_user_and_database() {
    database=$1
    echo "Creating database '$database'"
    
    # Create database and user
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE DATABASE "$database";
        
        -- Create user if not exists
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'integrated-tools-user') THEN
                CREATE USER "integrated-tools-user" WITH PASSWORD 'integrated-tools-password-1234';
            END IF;
        END
        \$\$;
        
        GRANT ALL PRIVILEGES ON DATABASE "$database" TO "integrated-tools-user";
EOSQL
    
    echo "Database '$database' created successfully"
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created"
fi

echo "Database initialization script completed" 