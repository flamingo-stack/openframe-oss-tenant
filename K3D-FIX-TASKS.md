# K3D Cluster Issues Fix Plan

Brief description: This plan outlines the steps to fix the issues with the K3D Kubernetes cluster deployment in OpenFrame, addressing port conflicts, networking issues, and connection problems.

## Completed Tasks

- [x] Identify the key issues from the logs: port conflicts, flannel networking, and API connection problems

## In Progress Tasks

- [ ] Analyze the specific port conflicts with ingress-nginx-admission

## Future Tasks

### 1. Address Port Conflicts
- [ ] Check for ports already in use on the host system
  - [ ] Run `lsof -i -P -n | grep LISTEN` to identify ports being used
  - [ ] Check if port 80 is being used by other services
- [ ] Resolve conflicts with ingress-nginx-admission pod
  - [ ] Validate the ingress-nginx-admission is trying to use port 80 for both apps
  - [ ] Verify scheduler is failing due to "0/10 nodes are available: 10 node(s) didn't have free ports"
- [ ] Create a new K3d cluster with proper port mappings
  - [ ] Use `-p "8080:80@loadbalancer" -p "8443:443@loadbalancer"` to expose HTTP/HTTPS ports
  - [ ] Use unique ports for each app if needed

### 2. Fix Networking Issues
- [ ] Resolve flannel network configuration issues
  - [ ] Check flannel subnet.env file creation process
  - [ ] Verify if `/run/flannel/subnet.env` is being properly created and mounted
  - [ ] Address the error: "failed to setup network for sandbox: plugin type=\"flannel\" failed (add): loadFlannelSubnetEnv failed"
- [ ] Fix API server connection problems
  - [ ] Address "The connection to the server localhost:8080 was refused" errors
  - [ ] Ensure kubectl is properly configured to use the right API server endpoint
  - [ ] Check if k3d server is properly exposing the API port (default 6443)

### 3. Resolve Permission Issues
- [ ] Fix kernel module loading issues
  - [ ] Identify which modules failed to load: br_netfilter, iptable_nat, iptable_filter
  - [ ] Address "Failed to set sysctl: open /proc/sys/net/netfilter/nf_conntrack_max: permission denied"
  - [ ] Consider using k3s versions that work around kernel networking permission issues
  - [ ] Check if passing `--k3s-arg "--kube-proxy-arg=conntrack-max-per-core=0@server:*"` is needed

### 4. Create a Custom K3d Cluster Configuration
- [ ] Define a proper cluster config file (k3d.yaml) with appropriate settings
  ```yaml
  apiVersion: k3d.io/v1alpha4
  kind: Simple
  servers: 1
  agents: 3 # Adjust based on needs
  ports:
    - port: 8080:80
      nodeFilters:
        - loadbalancer
    - port: 8443:443
      nodeFilters:
        - loadbalancer
  options:
    k3s:
      extraArgs:
        - arg: "--no-deploy=traefik" # Only if you want to use a different ingress
        - arg: "--kubelet-arg=eviction-hard=imagefs.available<1%,nodefs.available<1%"
          nodeFilters:
            - agent:*
  ```
- [ ] Customize resource limits if needed
- [ ] Set appropriate eviction thresholds to prevent pod evictions

### 5. Reset and Recreate the Cluster
- [ ] Clean up any existing clusters
  - [ ] Run `k3d cluster delete openframe-dev`
  - [ ] Check for any leftover Docker containers or networks
- [ ] Create a new cluster with the fixed configuration
  - [ ] Use the created config file: `k3d cluster create --config k3d.yaml`
  - [ ] Or use CLI parameters to fix specific issues
- [ ] Verify all nodes are running correctly
  - [ ] Check node status: `kubectl get nodes`
  - [ ] Check for any node-related errors in logs

### 6. Test Deployment After Fixes
- [ ] Verify cluster functionality
  - [ ] Test pod scheduling
  - [ ] Ensure ingress is working properly with the new port mappings
  - [ ] Test pod-to-pod and pod-to-service networking
- [ ] Validate flannel network is operating correctly
  - [ ] Check if pods from different nodes can communicate
  - [ ] Verify DNS resolution works between services

## Implementation Plan

### Root Causes Identified
1. Port conflicts: The ingress-nginx-admission can't find free ports to bind to on the nodes
2. Flannel networking issues: The subnet.env file is not being properly created
3. Permission issues: The k3s containers can't set network parameters due to permission restrictions
4. Connection issues: API server connectivity problems due to misconfiguration

### Step-by-Step Resolution Approach
1. First, we'll clean up any existing clusters and check for port conflicts
2. Create a new cluster with proper port mappings to expose services
3. Apply necessary arguments to k3s to avoid permission issues
4. Validate pods are properly scheduled and can communicate
5. Test ingress functionality to ensure external access works

### Relevant Files
- scripts/run-mac.sh - Script for setting up the environment on macOS
- scripts/run.sh - Main setup script that runs the deployment

### Commands for Execution
1. Delete existing cluster: `k3d cluster delete openframe-dev`
2. Create new cluster: `k3d cluster create openframe-dev -p "8080:80@loadbalancer" -p "8443:443@loadbalancer" --agents 3 --k3s-arg "--kubelet-arg=eviction-hard=imagefs.available<1%,nodefs.available<1%@agent:*" --k3s-arg "--kube-proxy-arg=conntrack-max-per-core=0@server:*"`
3. Verify cluster: `kubectl get nodes` and `kubectl get pods -A` 