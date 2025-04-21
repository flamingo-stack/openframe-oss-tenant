#!/bin/bash

# Enhanced spinner implementation combining features from spinner.sh and execute-and-wait.sh
# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Spinner frames with more visual appeal
FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

# Symbols for success/failure
CHECK_SYMBOL='\u2713'
X_SYMBOL='\u2A2F'

_spinner_pid=
_message=
_start_time=

function _spin() {
    local delay=0.1
    local frames_size=${#FRAMES[@]}
    local i=0

    # Hide cursor
    tput civis

    while true; do
        printf "${YELLOW}${FRAMES[$i]} ${BOLD}%s${NC}" "$1"
        i=$(( (i + 1) % frames_size ))
        sleep $delay
        printf "\r\033[K"  # Clear the line
    done
}

function start_spinner() {
    _message="${1:-Processing...} "
    _start_time=$(date +%s)

    # Start spinner in background
    _spin "$_message" &
    _spinner_pid=$!

    # Disown the process to prevent shell messages if it gets killed
    disown $_spinner_pid 2>/dev/null
}

function stop_spinner() {
    local exit_code=${1:-0}
    local end_time=$(date +%s)
    local duration=$((end_time - _start_time))

    # Kill the spinner process
    if [ -n "$_spinner_pid" ] && ps -p $_spinner_pid > /dev/null; then
        kill $_spinner_pid
    fi

    # Show cursor again
    tput cnorm

    # Print final status with color and duration
    if [ $exit_code -eq 0 ]; then
        printf "\r${GREEN}${CHECK_SYMBOL} ${_message}${CYAN} [%3ds]${NC}\n" $duration
    else
        printf "\r${RED}${X_SYMBOL} ${_message}${CYAN} [%3ds]${NC}\n" $duration
    fi

    _spinner_pid=
    _message=
    _start_time=
}

# # Ensure spinner is stopped on script exit
# trap 'stop_spinner 1' SIGINT SIGTERM

# # Example usage:
# if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
#     echo "Running example..."

#     start_spinner "Performing a long task..."
#     sleep 5  # Simulate long running task
#     stop_spinner 0

#     start_spinner "Performing a failing task..."
#     sleep 3  # Simulate long running task
#     stop_spinner 1
# fi