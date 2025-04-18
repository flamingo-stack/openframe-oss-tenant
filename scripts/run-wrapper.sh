#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Show the help information at the beginning
echo "Script help:"
bash "${SCRIPT_DIR}/run.sh" "--help"

# Start an infinite loop
while true; do
    echo ""
    echo "Please enter the required parameters (or type 'exit' to quit, 'help' to see help again):"
    read -p "> " params

    # Check user input
    if [ "$params" = "exit" ]; then
        echo "Exiting script."
        break
    elif [ "$params" = "help" ]; then
        echo "Script help:"
        bash "${SCRIPT_DIR}/run.sh" "--help"
        continue
    fi

    # Execute the script with the entered parameters
    bash "${SCRIPT_DIR}/run.sh" $params

    # Optional: ask if the user wants to continue
    echo ""
    read -p "Do you want to try another command? (y/n): " continue_answer
    if [ "$continue_answer" != "y" ] && [ "$continue_answer" != "Y" ]; then
        echo "Exiting script."
        break
    fi
done