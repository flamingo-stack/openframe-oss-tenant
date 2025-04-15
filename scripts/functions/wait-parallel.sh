#!/bin/bash

# Function to wait for parallel jobs and check their status
wait_parallel() {
  local failed=0
  local failed_apps=()

  # Wait for all background processes
  while true; do
    # Get all background jobs
    jobs -p > /dev/null

    # No more jobs running? Then break
    [[ -z "$(jobs -p)" ]] && break

    # Wait for the next job to finish
    wait -n 2>/dev/null || {
      # Capture failed job PID
      failed=1
      # Get the most recently failed job's command
      failed_job=$(jobs -l | grep "Exit" | head -n1 | awk '{print $4}')
      failed_apps+=("$failed_job")
    }
  done

  # Report failures if any
  if [ $failed -eq 1 ]; then
    echo "The following apps failed to deploy:"
    printf '%s\n' "${failed_apps[@]}"
    return 1
  fi

  return 0
}
