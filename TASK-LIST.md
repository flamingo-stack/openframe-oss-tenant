# K3D Cluster Launch Concurrency Optimization

This task list outlines steps to increase concurrency in the k3d cluster launch process, making the cluster run faster.

## Completed Tasks

- [x] Initial research on current k3d cluster setup implementation
- [x] Identify bottlenecks in current cluster launch process

## In Progress Tasks

- [ ] Implement parallel initialization for k3d agent nodes
- [ ] Add resource optimization parameters to k3d cluster creation
- [ ] Update setup_cluster function to utilize more concurrent operations

## Future Tasks

- [ ] Add concurrent deployment of base services
- [ ] Implement health check parallelization 
- [ ] Add configurable concurrency settings in variables.sh
- [ ] Optimize container image pulling with parallel downloads
- [ ] Set up parallel namespace creation
- [ ] Parallelize secret creation across namespaces
- [ ] Create benchmarking function to measure launch performance

## Implementation Plan

The implementation will focus on optimizing the k3d cluster launch process by increasing parallelization and concurrency at various stages. This will be done by modifying the setup_cluster function and related components.

### Concurrency Improvements

1. **Parallel Node Initialization**:
   - Modify the k3d cluster creation to use more concurrent operations
   - Implement optimized resource allocation for agent nodes

2. **Base Service Deployment Optimization**:
   - Parallelize the deployment of essential services
   - Implement concurrent namespace and secret creation

3. **Resource Utilization Improvements**:
   - Fine-tune CPU and memory allocation based on system resources
   - Optimize container image pulling with prefetching and caching

4. **Performance Measurement**:
   - Add benchmarking to compare before/after performance
   - Create configurable concurrency settings

### Relevant Files

- scripts/functions/apps-setup-cluster.sh - Main file for cluster setup function
- scripts/run.sh - Main script that orchestrates the setup process
- scripts/functions/variables.sh - Contains configuration variables
- scripts/functions/apps-common.sh - Contains functions for namespace and secret creation
- scripts/functions/wait-parallel.sh - Contains parallelization functions for waiting 

## Detailed Implementation - Parallel Node Initialization

### Task 1: Implement parallel initialization for k3d agent nodes

This task involves modifying the `setup_cluster` function in `scripts/functions/apps-setup-cluster.sh` to:

1. **Pre-pull required Docker images in parallel**:
   ```bash
   # Pull images in advance to speed up cluster creation
   echo "Pre-pulling k3d images for faster initialization..."
   docker pull "$K3S_IMAGE" &
   docker pull "ghcr.io/k3d-io/k3d-proxy:latest" &
   docker pull "ghcr.io/k3d-io/k3d-tools:latest" &
   wait
   ```

2. **Calculate optimal concurrency level based on system resources**:
   ```bash
   # Improved agent calculation: more aggressive scaling with available resources
   OPTIMAL_AGENTS=$((TOTAL_CPU / 2))
   [ "$OPTIMAL_AGENTS" -lt 1 ] && OPTIMAL_AGENTS=1
   
   # Calculate max agents based on memory (2GB per agent as a rough estimate)
   MAX_AGENTS_BY_MEM=$((TOTAL_MEM / 2))
   [ "$MAX_AGENTS_BY_MEM" -lt 1 ] && MAX_AGENTS_BY_MEM=1
   
   # Use the smaller of the two values to avoid resource exhaustion
   if [ "$MAX_AGENTS_BY_MEM" -lt "$OPTIMAL_AGENTS" ]; then
       OPTIMAL_AGENTS=$MAX_AGENTS_BY_MEM
   fi
   
   # Set concurrency level for initialization
   CONCURRENCY_LEVEL=$OPTIMAL_AGENTS
   
   # Maximum 6 agents to avoid diminishing returns
   [ "$OPTIMAL_AGENTS" -gt 6 ] && OPTIMAL_AGENTS=6
   ```

3. **Add concurrency parameters to k3d cluster creation**:
   ```bash
   # Add these parameters to the k3d cluster create command
   --k3s-server-arg "--kube-scheduler-arg=v=5" \
   --k3s-arg "--kube-controller-manager-arg=concurrent-service-syncs=$CONCURRENCY_LEVEL@server:0" \
   --k3s-arg "--kube-controller-manager-arg=concurrent-rc-syncs=$CONCURRENCY_LEVEL@server:0" \
   --k3s-arg "--kube-controller-manager-arg=concurrent-deployment-syncs=$CONCURRENCY_LEVEL@server:0" \
   --k3s-arg "--kubelet-arg=max-parallelism=$CONCURRENCY_LEVEL@server:0" \
   --registry-create k3d-openframe-registry \
   --timeout 180s
   ```

4. **Implement parallel health checking for cluster nodes**:
   ```bash
   # Function to check cluster endpoints in parallel
   check_cluster_endpoints() {
       local endpoint=$1
       kubectl get --raw="$endpoint" &>/dev/null
       return $?
   }
   
   # Check multiple endpoints in parallel
   until check_cluster_endpoints "/api" && \
         check_cluster_endpoints "/apis" && \
         check_cluster_endpoints "/healthz"; do
       # Check timeout logic
   done
   ```

5. **Pre-create namespaces in parallel**:
   ```bash
   # Pre-create namespaces in parallel to speed up initialization
   echo "Pre-creating namespaces in parallel..."
   for ns in $NAMESPACES; do
       kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f - &
   done
   wait
   ```

These changes will significantly improve the cluster initialization time by leveraging parallel operations and optimizing resource allocation.

### Task 2: Add resource optimization parameters to k3d cluster creation

This task involves adding Docker and Kubernetes resource optimization parameters to the k3d cluster creation to improve performance:

1. **Add resource limitation and optimization variables to `variables.sh`**:
   ```bash
   # Resource optimization settings
   export K3D_RESOURCE_OPTIMIZATION="${K3D_RESOURCE_OPTIMIZATION:-true}"
   export K3D_MEMORY_LIMIT_SERVER="${K3D_MEMORY_LIMIT_SERVER:-2G}"  # Memory limit for server node
   export K3D_MEMORY_LIMIT_AGENT="${K3D_MEMORY_LIMIT_AGENT:-1.5G}"  # Memory limit per agent node
   export K3D_CPU_LIMIT_SERVER="${K3D_CPU_LIMIT_SERVER:-2}"         # CPU limit for server node
   export K3D_CPU_LIMIT_AGENT="${K3D_CPU_LIMIT_AGENT:-1}"           # CPU limit per agent node
   export K3D_CONCURRENT_DOWNLOADS="${K3D_CONCURRENT_DOWNLOADS:-3}" # Concurrent image downloads
   ```

2. **Modify Docker resource settings in k3d cluster creation**:
   ```bash
   # Resource settings for Docker nodes
   SERVER_OPTS=""
   AGENT_OPTS=""
   
   if [ "$K3D_RESOURCE_OPTIMIZATION" = "true" ]; then
     SERVER_OPTS="--memory=${K3D_MEMORY_LIMIT_SERVER} --cpus=${K3D_CPU_LIMIT_SERVER}"
     AGENT_OPTS="--memory=${K3D_MEMORY_LIMIT_AGENT} --cpus=${K3D_CPU_LIMIT_AGENT}"
   fi
   
   # Add to k3d cluster create command
   k3d cluster create openframe-dev \
       --servers-memory "${K3D_MEMORY_LIMIT_SERVER}" \
       --agents-memory "${K3D_MEMORY_LIMIT_AGENT}" \
       --k3s-node-label "role=server@server:0" \
       --k3s-node-label "role=agent@agent:*" \
       # ... existing parameters ...
   ```

3. **Add container registry and caching optimizations**:
   ```bash
   # Add to k3d cluster create command
   --registry-create k3d-openframe-registry \
   --registry-config "${SCRIPT_DIR}/files/registries.yaml" \
   --k3s-arg "--kubelet-arg=serialize-image-pulls=false@all" \
   --k3s-arg "--kubelet-arg=image-pull-progress-deadline=2m@all" \
   --k3s-arg "--kubelet-arg=max-parallel-image-pulls=${K3D_CONCURRENT_DOWNLOADS}@all" \
   ```

4. **Create a new registries.yaml file in scripts/files/ directory**:
   ```yaml
   # scripts/files/registries.yaml
   mirrors:
     "docker.io":
       endpoint:
         - "http://k3d-openframe-registry:5000"
     "ghcr.io":
       endpoint:
         - "http://k3d-openframe-registry:5000"
   ```

5. **Add Docker daemon optimization**:
   ```bash
   # Function to optimize Docker daemon settings
   optimize_docker_daemon() {
     if [ -f "/etc/docker/daemon.json" ]; then
       echo "Optimizing Docker daemon settings for faster image pulls"
       # Create temp file with optimized settings
       TMP_DAEMON_JSON=$(mktemp)
       cat > "$TMP_DAEMON_JSON" <<EOF
   {
     "max-concurrent-downloads": ${K3D_CONCURRENT_DOWNLOADS},
     "max-concurrent-uploads": ${K3D_CONCURRENT_DOWNLOADS},
     "registry-mirrors": ["http://k3d-openframe-registry:5000"]
   }
   EOF
       # Merge with existing daemon.json or create new one
       if command -v jq >/dev/null 2>&1; then
         if [ -s "/etc/docker/daemon.json" ]; then
           jq -s '.[0] * .[1]' "/etc/docker/daemon.json" "$TMP_DAEMON_JSON" > daemon.json.new
           sudo mv daemon.json.new /etc/docker/daemon.json
         else
           sudo cp "$TMP_DAEMON_JSON" /etc/docker/daemon.json
         fi
         rm "$TMP_DAEMON_JSON"
         # Note: would need to restart Docker to apply changes
       fi
     fi
   }
   
   # Call before k3d cluster creation if user has proper permissions
   if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
     optimize_docker_daemon
   fi
   ```

These optimizations will improve resource allocation and image pull performance, resulting in faster cluster initialization and better resource utilization during the cluster launch process.

### Task 3: Update setup_cluster function to utilize more concurrent operations

This task involves modifying the existing setup_cluster function to leverage parallelization for various operations:

1. **Create a parallel execution wrapper function in `wait-parallel.sh`**:
   ```bash
   # Function to execute commands in parallel with a controlled maximum number of concurrent processes
   function parallel_exec() {
     local max_concurrent=$1
     shift
     
     # If max_concurrent is not specified, use the number of CPU cores
     if [ -z "$max_concurrent" ] || [ "$max_concurrent" -lt 1 ]; then
       max_concurrent=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
     fi
     
     local cmds=("$@")
     local running=0
     local pids=()
     
     for cmd in "${cmds[@]}"; do
       # If we've reached max concurrent processes, wait for one to finish
       if [ $running -ge $max_concurrent ]; then
         wait -n  # Wait for any child process to exit
         running=$((running - 1))
       fi
       
       # Execute the command in background
       eval "$cmd" &
       pids+=($!)
       running=$((running + 1))
     done
     
     # Wait for all remaining background processes to complete
     for pid in "${pids[@]}"; do
       wait $pid
     done
   }
   ```

2. **Parallel helm repo updates in setup_cluster**:
   ```bash
   # Update helm repos in parallel
   echo "Updating helm repos indexes in parallel"
   helm_repos=(
     "https://charts.jetstack.io"
     "https://kubernetes.github.io/ingress-nginx"
     "https://prometheus-community.github.io/helm-charts"
     "https://grafana.github.io/helm-charts"
     "https://charts.bitnami.com/bitnami"
   )
   
   helm_cmds=()
   for repo in "${helm_repos[@]}"; do
     repo_name=$(basename $repo)
     helm_cmds+=("helm repo add $repo_name $repo && helm repo update $repo_name")
   done
   
   parallel_exec $CONCURRENCY_LEVEL "${helm_cmds[@]}"
   ```

3. **Add a parallel cluster health check function**:
   ```bash
   # Function to check cluster health in parallel
   function check_cluster_health_parallel() {
     local timeout=$1
     local counter=0
     local success=false
     
     # Health check endpoints to verify
     local endpoints=(
       "/api"
       "/apis"
       "/healthz"
       "/healthz/etcd"
       "/healthz/poststarthook/start-kube-apiserver-admission-initializer"
     )
     
     until [ "$success" = true ] || [ $counter -ge $timeout ]; do
       local all_succeeded=true
       local check_cmds=()
       
       # Prepare commands for each endpoint
       for endpoint in "${endpoints[@]}"; do
         check_cmds+=("kubectl get --raw=\"$endpoint\" &>/dev/null")
       done
       
       # Execute checks in parallel
       for cmd in "${check_cmds[@]}"; do
         if ! eval "$cmd"; then
           all_succeeded=false
           break
         fi
       done
       
       if [ "$all_succeeded" = true ]; then
         success=true
         break
       fi
       
       echo "Waiting for cluster API... ($counter/$timeout)"
       sleep 1
       ((counter++))
     done
     
     if [ "$success" = true ]; then
       echo "Cluster API is accessible!"
       return 0
     else
       echo "ERROR: Timed out waiting for cluster API to become accessible"
       echo "Try restarting Docker Desktop and running this script again"
       return 1
     fi
   }
   ```

4. **Implement parallel resource creation during cluster setup**:
   ```bash
   # Function to parallelize core Kubernetes resource creation
   function setup_core_resources_parallel() {
     local cmds=(
       # Create ConfigMap for node-local DNS cache
       "kubectl apply -f ${SCRIPT_DIR}/files/nodelocaldns-configmap.yaml"
       
       # Create StorageClass for local-path provisioner
       "kubectl apply -f ${SCRIPT_DIR}/files/local-path-storage.yaml"
       
       # Create default network policies
       "kubectl apply -f ${SCRIPT_DIR}/files/default-network-policies.yaml"
       
       # Create resource quotas for namespaces
       "kubectl apply -f ${SCRIPT_DIR}/files/resource-quotas.yaml"
     )
     
     parallel_exec $CONCURRENCY_LEVEL "${cmds[@]}"
   }
   ```

5. **Add benchmarking function to measure performance improvements**:
   ```bash
   # Function to measure and log cluster setup time
   function benchmark_cluster_setup() {
     local start_time=$1
     local end_time=$2
     local log_file="${DEPLOY_LOG_DIR}/cluster_setup_benchmark.log"
     
     mkdir -p "$(dirname "$log_file")"
     
     local duration=$((end_time - start_time))
     local minutes=$((duration / 60))
     local seconds=$((duration % 60))
     
     echo "Cluster setup completed in ${minutes}m ${seconds}s" | tee -a "$log_file"
     
     # Log system information
     {
       echo "System information:"
       echo "  CPU cores: $TOTAL_CPU"
       echo "  Memory: ${TOTAL_MEM}GB"
       echo "  Agents: $OPTIMAL_AGENTS"
       echo "  Concurrency level: $CONCURRENCY_LEVEL"
       echo "  Architecture: $(uname -m)"
       echo "  OS: $(uname -s)"
       echo "  K3s Image: $K3S_IMAGE"
       echo "---"
     } >> "$log_file"
   }
   ```

These enhancements will significantly improve the cluster setup performance by implementing parallel operations at various stages of the initialization process, from container image pulling to resource creation and health checking. 