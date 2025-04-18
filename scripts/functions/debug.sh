#!/bin/bash

cleanup() {
  echo ""
  echo "Cleaning up intercept: $SERVICE_NAME"
  telepresence leave "$SERVICE_NAME"
  exit 0
}

function debug_app() {
  # Use the passed parameters instead of hardcoded values
  SERVICE_NAME="$1"
  WORKLOAD_NAME="$2"
  LOCAL_PORT="$3"
  REMOTE_PORT_NAME="$4"

  # Handle cleanup on Ctrl+C
  trap cleanup INT

  # Start intercept
  echo "Starting intercept for $SERVICE_NAME in namespace $NAMESPACE..."
  telepresence intercept "$SERVICE_NAME" \
    --service "$INTERCEPT_NAME" \
    --workload "$WORKLOAD_NAME" \
    --port "$LOCAL_PORT:$REMOTE_PORT_NAME"

  # Keep script alive until interrupted
  echo "Intercept running. Press Ctrl+C to stop..."
  while true; do sleep 1; done
}
