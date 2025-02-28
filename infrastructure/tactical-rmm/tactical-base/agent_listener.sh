#!/bin/bash

# Ensure we capture errors
set -e

# Print commands for debugging
set -x

# Go to the correct directory
cd ${TACTICAL_DIR}/api/

if [ -f "${VIRTUAL_ENV}/bin/activate" ]; then
    source ${VIRTUAL_ENV}/bin/activate
else
    echo "Virtual environment not found"
fi

# Add debugging output
echo "Starting agent listener at $(date)"
echo "Current directory: $(pwd)"
echo "Python path: $(which python)"

# Run the agent listener
python ${TACTICAL_DIR}/api/manage.py start_agent_listener --foreground