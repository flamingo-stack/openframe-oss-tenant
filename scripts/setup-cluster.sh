#!/bin/bash

echo "Updating helm repos indexes"
# helm repo update > /dev/null 2>&1

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
else
    echo "Unsupported operating system: $OS"
    exit 1
fi

# Bootsrap cluster
# if ! [ "kind" == "$(kind get clusters --quiet)" ]; then
#     # Ask about persistent volumes if not set
#     if [ -z "${PERSISTENT_VOLUMES}" ]; then
#         read -p "Do you want to enable persistent volumes? (y/N): " enable_volumes
#         if [[ "${enable_volumes}" =~ ^[Yy]$ ]]; then
#             PERSISTENT_VOLUMES=true
#         else
#             PERSISTENT_VOLUMES=false
#         fi
#     fi

#     # Handle persistent volumes setup if enabled
#     if [ "${PERSISTENT_VOLUMES}" = "true" ]; then
#         # Ask for volume path if not provided
#         if [ -z "${KIND_VOLUME_PATH}" ]; then
#             read -p "Enter path for kind volumes [default: $HOME/kind-volumes]: " KIND_VOLUME_PATH
#             KIND_VOLUME_PATH=${KIND_VOLUME_PATH:-$HOME/kind-volumes}
#         fi

#         # Check if directory exists and has content
#         if [ -d "${KIND_VOLUME_PATH}" ] && [ "$(ls -A ${KIND_VOLUME_PATH} 2>/dev/null)" ]; then
#             read -p "Directory ${KIND_VOLUME_PATH} exists and has content. Delete contents? (y/N): " should_delete
#             if [[ "${should_delete}" =~ ^[Yy]$ ]]; then
#                 # Safety check for path
#                 if [ "${KIND_VOLUME_PATH}" != "/" ] && [ -n "${KIND_VOLUME_PATH}" ]; then
#                     echo "Deleting contents of ${KIND_VOLUME_PATH}..."
#                     # Use shopt to ensure glob patterns that don't match return null
#                     shopt -s nullglob
#                     sudo rm -rf "${KIND_VOLUME_PATH}"/{*,.*} 2>/dev/null || true
#                     shopt -u nullglob
#                 fi
#             fi
#         fi

#         # Create volumes directory and set permissions
#         sudo mkdir -p "${KIND_VOLUME_PATH}"
#         # Get current user and group
#         CURRENT_USER=$(id -u)
#         CURRENT_GROUP=$(id -g)
#         sudo chown -R ${CURRENT_USER}:${CURRENT_GROUP} "${KIND_VOLUME_PATH}"
#         sudo chmod 755 "${KIND_VOLUME_PATH}"

#         # Prepare volume mounts configuration
#         export VOLUME_MOUNTS="extraMounts:
#   - hostPath: ${KIND_VOLUME_PATH}
#     containerPath: /var/local-path-provisioner"
#     else
#         export VOLUME_MOUNTS=""
#     fi

#     # Convert types for template
#     export PORT=$((${API_SERVER_PORT:-6443}))
#     if [[ "${DISABLE_DEFAULT_CNI:-false}" =~ ^(true|yes|y|1)$ ]]; then
#         export CNI=true
#     else
#         export CNI=false
#     fi

#     # Process template and create cluster
#     CLUSTER_CONFIG_FILE="$(mktemp)"
#     echo "Creating cluster config file: $CLUSTER_CONFIG_FILE"
#     envsubst < ./deploy/kind/cluster.template.yaml > $CLUSTER_CONFIG_FILE
#     kind create cluster --config $CLUSTER_CONFIG_FILE --image kindest/node:$K8S_VERSION
# else
#     echo "Cluster already setup"
# fi


# Create a new k3d cluster
if ! [ "openframe-dev" == "$(k3d cluster list --no-headers | tr -s "  " " " | cut -d " " -f 1)" ]; then
    k3d cluster create openframe-dev \
        --servers 1 \
        --agents 3 \
        --image rancher/k3s:v1.32.3-k3s1 \
        --k3s-arg "--disable=traefik@server:0" \
        --port "80:80@loadbalancer" \
        --port "443:443@loadbalancer" \
        --k3s-arg "--kubelet-arg=eviction-hard=nodefs.available<1%,nodefs.inodesFree<1%,imagefs.available<1%"@all
else
    echo "Cluster already setup"
fi
