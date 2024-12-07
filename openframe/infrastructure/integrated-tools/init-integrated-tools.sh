#!/bin/bash
set -e

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    
    # Generate Authentik secret key
    AUTHENTIK_SECRET_KEY=$(openssl rand -base64 60 | tr -d '\n')
    echo "AUTHENTIK_SECRET_KEY=$AUTHENTIK_SECRET_KEY" >> .env
    
    # Enable error reporting
    echo "AUTHENTIK_ERROR_REPORTING__ENABLED=true" >> .env
    
    # Configure email settings (customize as needed)
    cat << EOF >> .env
# SMTP Configuration
AUTHENTIK_EMAIL__HOST=localhost
AUTHENTIK_EMAIL__PORT=25
AUTHENTIK_EMAIL__USERNAME=
AUTHENTIK_EMAIL__PASSWORD=
AUTHENTIK_EMAIL__USE_TLS=false
AUTHENTIK_EMAIL__USE_SSL=false
AUTHENTIK_EMAIL__TIMEOUT=10
AUTHENTIK_EMAIL__FROM=authentik@localhost

# Port Configuration
COMPOSE_PORT_HTTP=9000
COMPOSE_PORT_HTTPS=9443
EOF

    echo ".env file created successfully"
else
    echo ".env file already exists, skipping creation"
fi

# Create necessary directories
mkdir -p volumes/authentik/{media,certs,custom-templates}

# Start the services
echo "Starting Integrated Tools services..."
docker compose -f docker-compose.openframe-integrated-tools.yml pull
docker compose -f docker-compose.openframe-integrated-tools.yml up -d

echo "Authentik is starting up. Initial setup will be available at:"
echo "http://localhost:9000/if/flow/initial-setup/"
echo "Default admin username: akadmin"

echo "Fleet is starting up. Initial setup will be available at:"
echo "http://localhost:8070"
echo "Default admin credentials:"
echo "Email: admin@openframe.local"
echo "Password: openframe123!" 