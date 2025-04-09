#!/bin/bash

# Process the template file
envsubst < /docker-entrypoint-initdb.d/tactical-init.sql.template > /docker-entrypoint-initdb.d/tactical-init.sql

# Wait for PostgreSQL to be ready
until pg_isready -h localhost -p 5432; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 1
done

# Run the initialization script
echo "Running tactical initialization script..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/tactical-init.sql 