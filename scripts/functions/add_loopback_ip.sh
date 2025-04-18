#!/bin/bash

# Add a loopback IP to the cluster

# Get the current IP address of the cluster

function add_loopback_ip() {
  # Check operating system and configure IP accordingly
  if [[ "$OS" == "Linux" ]]; then
      # Check if the IP is already assigned to the loopback interface
      if ip addr show dev lo | grep -q "inet $IP/24"; then
          echo "IP $IP is already added to the loopback interface."
      else
          # Add the IP address to the loopback interface
          sudo ip addr add "$IP/24" dev lo
          echo "IP $IP added to the loopback interface."
      fi
  elif [[ "$OS" == "Darwin" ]]; then
      # Check if the IP is already added to the loopback interface
      if ifconfig lo0 | grep -q "inet $IP"; then
          echo "IP $IP is already added to the loopback interface."
      else
          # Add the IP address to the loopback interface on macOS
          sudo ifconfig lo0 alias $IP up
          echo "IP $IP added to the loopback interface."
      fi
  elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
      # Windows - using Git Bash
      # Check if the IP is already added to any interface
      if ipconfig | grep -q "$IP"; then
          echo "IP $IP is already configured on an interface."
      else
          echo "Error: IP $IP is not configured on any interface."
          echo "On Windows, please add the loopback interface and configure the IP address manually."
          echo "You can do this through Device Manager and Network Settings as an administrator."
          exit 1
      fi
  else
      echo "Unsupported operating system: $OS"
      exit 1
  fi
}
