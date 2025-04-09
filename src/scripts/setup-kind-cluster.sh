#!/bin/bash

helm repo update

# Bootsrap cluster
if ! [ "kind" == "$(kind get clusters --quiet)" ]; then
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
        # Check if the IP is already assigned to the loopback interface
        if ifconfig lo0 | grep -q "inet $IP"; then
            echo "IP $IP is already added to the loopback interface."
        else
            # Add the IP address to the loopback interface on macOS
            sudo ifconfig lo0 alias $IP up
            echo "IP $IP added to the loopback interface."
        fi
    else
        echo "Unsupported operating system: $OS"
        exit 1
    fi

    kind create cluster --config ./src/kind/cluster.yaml --image kindest/node:$K8S_VERSION
else
    echo "Cluster already setup"
fi
