#!/bin/bash
# MongoDB Readiness Probe Script
# Best practice: Check both connectivity and replica set member state
# Exit codes: 0 = ready, 1 = not ready

set -euo pipefail

# Configuration
readonly DB_HOST="${MONGODB_HOST:-127.0.0.1}"
readonly MONGODB_PORT="${MONGODB_PORT:-27017}"
readonly MONGO_USER="${MONGO_INITDB_ROOT_USERNAME:-}"
readonly MONGO_PASS="${MONGO_INITDB_ROOT_PASSWORD:-}"

# Check MongoDB readiness with proper replica set state validation
check_readiness() {
    local connection_string="mongodb://${DB_HOST}:${MONGODB_PORT}/admin"
    
    # Add authentication if credentials are provided
    if [[ -n "${MONGO_USER}" ]] && [[ -n "${MONGO_PASS}" ]]; then
        connection_string="mongodb://${MONGO_USER}:${MONGO_PASS}@${DB_HOST}:${MONGODB_PORT}/admin?authSource=admin"
    fi
    
    # Execute readiness check
    mongosh "${connection_string}" --quiet --eval '
        try {
            // Verify basic connectivity
            const pingResult = db.adminCommand({ ping: 1 });
            if (!pingResult.ok) {
                throw new Error("Ping failed");
            }
            
            // Get server status using hello command (replaces deprecated isMaster)
            const status = db.hello();
            
            // Check if this is a replica set member
            if (status.setName) {
                // Verify the member is in a healthy state
                if (status.isWritablePrimary || status.secondary || status.arbiterOnly) {
                    // Member is PRIMARY, SECONDARY, or ARBITER - all healthy states
                    print("READY");
                    quit(0);
                } else {
                    // Member exists but not in a healthy state (STARTUP, RECOVERING, etc.)
                    print("NOT_READY: Member state = " + (status.myState || "UNKNOWN"));
                    quit(1);
                }
            } else {
                // Standalone mode or replica set not configured
                // For our use case, this indicates initialization is incomplete
                print("NOT_READY: Replica set not configured");
                quit(1);
            }
        } catch (error) {
            // Handle specific error cases
            if (error.code === 13 || error.message.includes("not authorized")) {
                // Authentication failed - might be initial setup
                print("AUTH_ERROR");
                quit(2);
            } else if (error.code === 94 || error.message.includes("no replset config")) {
                // Replica set not initialized
                print("NOT_READY: No replica set config");
                quit(1);
            } else {
                // Other errors
                print("ERROR: " + error.message);
                quit(1);
            }
        }
    ' 2>/dev/null
}

# Main execution
main() {
    # First try without auth (for initialization phase)
    MONGO_USER="" MONGO_PASS="" check_readiness
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        exit 0
    fi
    
    # If that failed, try with authentication (normal operation)
    if [[ -n "${MONGO_USER}" ]] && [[ -n "${MONGO_PASS}" ]]; then
        check_readiness
        exit $?
    fi
    
    # Not ready
    exit 1
}

# Execute main function
main
