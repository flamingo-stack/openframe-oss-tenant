#!/bin/bash

# OpenFrame Agent Registration Script
# Registers Fleet MDM, MeshCentral, and Tactical RMM agents only
# Target: localhost:8095

set -e

# Configuration
OPENFRAME_MANAGEMENT_URL="http://localhost:8095"
HEALTH_CHECK_URL="http://localhost:8096/management/v1/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Wait for OpenFrame Management API to be available
wait_for_api() {
    log_info "Waiting for OpenFrame Management API to become reachable at $HEALTH_CHECK_URL..."
    until curl --head --fail --silent "$HEALTH_CHECK_URL" > /dev/null 2>&1; do
        log_warn "Still waiting for API to be available..."
        sleep 5
    done
    log_info "OpenFrame Management API is available!"
}


# Register Fleet MDM Agent
register_fleetmdm_agent() {
    log_info "Registering Fleet MDM Agent..."
    
    curl --verbose --show-error --fail \
        -X POST "${OPENFRAME_MANAGEMENT_URL}/v1/tool-agents/fleetmdm-agent" \
        -H "Content-Type: application/json" \
        -d '{
            "toolAgent": {
                "id": "fleetmdm-agent",
                "toolId": "fleetmdm-server",
                "version": "1.0",
                "status": "ENABLED",
                "runCommandArgs": [
                    "--fleet-url", "${client.serverUrl}",
                    "--enroll-secret", "${server.registrationSecret}",
                    "--insecure",
                    "--disable-updates",
                    "--openframe-mode",
                    "--openframe-secret", "${client.openframeSecret}",
                    "--openframe-osquery-path", "${client.assetPath.osquery}",
                    "--openframe-token-path", "${client.openframeTokenPath}"
                ],
                "assets": [
                    {
                        "id": "osquery",
                        "localFilename": "osquery",
                        "source": "ARTIFACTORY"
                    }
                ]
            }
        }' \
        --retry 3 \
        --retry-delay 2 \
        --retry-all-errors

    log_info "Fleet MDM Agent registration complete."
}


# Register MeshCentral Agent
register_meshcentral_agent() {
    log_info "Registering MeshCentral Agent..."
    
    curl --verbose --show-error --fail \
        -X POST "${OPENFRAME_MANAGEMENT_URL}/v1/tool-agents/meshcentral-agent" \
        -H "Content-Type: application/json" \
        -d '{
            "toolAgent": {
                "id": "meshcentral-agent",
                "toolId": "meshcentral-server",
                "version": "1.0",
                "status": "ENABLED",
                "runCommandArgs": [
                    "connect",
                    "--openframe-mode",
                    "--openframe-secret", "${client.openframeSecret}",
                    "--openframe-token-path", "${client.openframeTokenPath}"
                ],
                "assets": [
                    {
                        "id": "meshcentral-core-module",
                        "localFilename": "CoreModule.js",
                        "source": "ARTIFACTORY"
                    },
                    {
                        "id": "msh-configuration",
                        "localFilename": "agent.msh",
                        "source": "TOOL_API",
                        "path": "/openframe_public/meshagent.msh"
                    }
                ]
            }
        }' \
        --retry 3 \
        --retry-delay 2 \
        --retry-all-errors

    log_info "MeshCentral Agent registration complete."
}


# Register Tactical RMM Agent
register_tacticalrmm_agent() {
    log_info "Registering Tactical RMM Agent..."
    
    curl --verbose --show-error --fail \
        -X POST "${OPENFRAME_MANAGEMENT_URL}/v1/tool-agents/tacticalrmm-agent" \
        -H "Content-Type: application/json" \
        -d '{
            "toolAgent": {
                "id": "tacticalrmm-agent",
                "toolId": "tactical-rmm",
                "version": "1.0",
                "status": "ENABLED",
                "installationCommandArgs": [
                    "-m", "install",
                    "-api", "${client.serverUrl}",
                    "-auth", "${server.registrationSecret}",
                    "-client-id", "1",
                    "-site-id", "1",
                    "-agent-type", "workstation",
                    "-log", "DEBUG",
                    "-logto", "stdout",
                    "--openframe-mode",
                    "-nomesh",
                    "--openframe-secret", "${client.openframeSecret}",
                    "--openframe-token-path", "${client.openframeTokenPath}",
                    "—-insecure"
                ],
                "runCommandArgs": [
                    "-m", "svc",
                    "-log", "DEBUG",
                    "-logto", "stdout",
                    "-openframe-secret", "${client.openframeSecret}",
                    "--openframe-token-path", "${client.openframeTokenPath}"
                ]
            }
        }' \
        --retry 3 \
        --retry-delay 2 \
        --retry-all-errors

    log_info "Tactical RMM Agent registration complete."
}

# Main execution
main() {
    log_info "Starting OpenFrame Agent Registration Process..."
    log_info "Target Management API: $OPENFRAME_MANAGEMENT_URL"
    
    # Wait for API to be available
    wait_for_api
    
    # Register all agents only
    log_info "=== Registering Fleet MDM Agent ==="
    register_fleetmdm_agent
    
    log_info "=== Registering MeshCentral Agent ==="
    register_meshcentral_agent
    
    log_info "=== Registering Tactical RMM Agent ==="
    register_tacticalrmm_agent
    
    log_info "All agent registrations completed successfully!"
    log_info ""
    log_info "NOTE: This script registers agents only. Make sure the corresponding servers"
    log_info "are already registered before running this script:"
    log_info "  - Fleet MDM Server (fleetmdm-server)"
    log_info "  - MeshCentral Server (meshcentral-server)"
    log_info "  - Tactical RMM Server (tactical-rmm)"
    log_info ""
    log_info "Agents use placeholder credentials. Please update them through the OpenFrame Management API or UI."
}

# Handle script arguments
case "${1:-}" in
    --fleet)
        wait_for_api
        register_fleetmdm_agent
        ;;
    --meshcentral)
        wait_for_api
        register_meshcentral_agent
        ;;
    --tactical)
        wait_for_api
        register_tacticalrmm_agent
        ;;
    --help|-h)
        echo "Usage: $0 [--fleet|--meshcentral|--tactical|--help]"
        echo ""
        echo "Options:"
        echo "  --fleet       Register only Fleet MDM Agent"
        echo "  --meshcentral Register only MeshCentral Agent"
        echo "  --tactical    Register only Tactical RMM Agent"
        echo "  --help        Show this help message"
        echo ""
        echo "Without arguments, registers all agents."
        echo "NOTE: Make sure corresponding servers are already registered."
        exit 0
        ;;
    *)
        main
        ;;
esac
