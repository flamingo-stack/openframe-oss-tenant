#!/bin/bash

# Ensure we capture errors
set -e

# Print commands for debugging
set -x

# Go to the correct directory
cd ${TACTICAL_DIR}/api/

# Activate virtual environment if needed
if [ -f "${TACTICAL_DIR}/api/env/bin/activate" ]; then
  source ${TACTICAL_DIR}/api/env/bin/activate
fi

# Add debugging output
echo "Starting agent listener at $(date)"
echo "Current directory: $(pwd)"
echo "Python path: $(which python)"

# Run the agent listener
python ${TACTICAL_DIR}/api/manage.py start_agent_listener --foreground