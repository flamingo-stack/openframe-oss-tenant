# cluster status

Show detailed status information for a Kubernetes cluster.

## Synopsis

```bash
openframe cluster status [NAME] [flags]
```

## Description

Displays comprehensive information about a cluster including health status, node details, installed applications, and resource usage. If no cluster name is provided, shows an interactive selector.

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `NAME` | Cluster name to check | No (interactive if omitted) |

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--detailed` | `-d` | Show detailed resource information | `false` |
| `--no-apps` | - | Skip application status checking | `false` |
| `--dry-run` | - | Show what would be checked | `false` |
| `--force` | `-f` | Not used for status command | `false` |
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress all output except errors | `false` |

## Interactive Selection

When no cluster name is provided:

```
Select a cluster to check status:
  > my-cluster     (k3d, 4 nodes)
    dev-cluster    (k3d, 2 nodes)
    test-cluster   (k3d, 3 nodes)

Use arrow keys to navigate, Enter to select, Ctrl+C to cancel
```

## Output Sections

### Basic Status

```
CLUSTER STATUS
────────────────────────────────────────────────────────────
Name:           my-cluster
Type:           k3d
Status:         Running
Created:        2024-01-15 10:30:00
K8s Version:    v1.31.5-k3s1
Nodes:          4 (1 control-plane, 3 workers)
Context:        k3d-my-cluster
API Server:     https://localhost:6550

NODE STATUS
────────────────────────────────────────────────────────────
NAME                    ROLE           STATUS    AGE
k3d-my-cluster-server-0 control-plane  Ready     2d3h
k3d-my-cluster-agent-0  worker         Ready     2d3h
k3d-my-cluster-agent-1  worker         Ready     2d3h
k3d-my-cluster-agent-2  worker         Ready     2d3h

INSTALLED APPLICATIONS (Helm)
────────────────────────────────────────────────────────────
NAME        NAMESPACE    STATUS     VERSION    UPDATED
argocd      argocd       deployed   8.1.4      2024-01-15 11:00:00
openframe   default      deployed   1.0.0      2024-01-15 11:30:00
```

### Detailed Status (`--detailed`)

Includes additional information:

```
RESOURCE USAGE
────────────────────────────────────────────────────────────
NODE                    CPU         MEMORY      STORAGE
k3d-my-cluster-server-0 15%/2cores  1.2GB/4GB   10GB/50GB
k3d-my-cluster-agent-0  20%/2cores  800MB/4GB   5GB/50GB
k3d-my-cluster-agent-1  25%/2cores  900MB/4GB   6GB/50GB
k3d-my-cluster-agent-2  18%/2cores  750MB/4GB   4GB/50GB

NETWORK CONFIGURATION
────────────────────────────────────────────────────────────
Port Mappings:
  80   -> 80   (HTTP)
  443  -> 443  (HTTPS)
  6550 -> 6443 (API Server)

STORAGE
────────────────────────────────────────────────────────────
Volumes:        5 mounted
Networks:       1 active (k3d-my-cluster)
Registries:     0 configured
```

## Examples

### Basic Usage

```bash
# Check specific cluster
openframe cluster status my-cluster

# Interactive selection
openframe cluster status
```

### Detailed Information

```bash
# Show all details including resources
openframe cluster status my-cluster --detailed

# Short flag
openframe cluster status my-cluster -d
```

### Skip Application Check

```bash
# Faster status without checking Helm releases
openframe cluster status my-cluster --no-apps

# Combine with detailed
openframe cluster status my-cluster -d --no-apps
```

### Scripting

```bash
# Check if cluster is running
if openframe cluster status my-cluster --silent; then
    echo "Cluster is healthy"
else
    echo "Cluster has issues"
fi

# Parse status output
openframe cluster status my-cluster | grep "Status:" | awk '{print $2}'
```

### Monitoring

```bash
# Watch cluster status
watch -n 5 "openframe cluster status my-cluster"

# Check all clusters
for cluster in $(openframe cluster list -q); do
    echo "=== $cluster ==="
    openframe cluster status "$cluster" --no-apps
done
```

## Status Indicators

### Cluster Status

| Status | Description |
|--------|-------------|
| `Running` | All nodes healthy and API accessible |
| `Degraded` | Some nodes unhealthy but cluster operational |
| `Stopped` | Cluster exists but not running |
| `Unknown` | Cannot determine status |

### Node Status

| Status | Description |
|--------|-------------|
| `Ready` | Node is healthy and accepting workloads |
| `NotReady` | Node is not accepting new workloads |
| `Unknown` | Node status cannot be determined |

### Application Status

| Status | Description |
|--------|-------------|
| `deployed` | Application successfully installed |
| `pending` | Installation in progress |
| `failed` | Installation failed |
| `unknown` | Status cannot be determined |

## Exit Codes

- `0` - Cluster is healthy
- `1` - Status check failed
- `3` - Cluster is degraded
- `4` - Cluster not found
- `130` - User cancelled (Ctrl+C)

## Performance Notes

Status checking involves:
1. Docker API calls for container status
2. Kubernetes API calls for node status
3. Helm API calls for application status (unless `--no-apps`)

Use `--no-apps` for faster checks when application status isn't needed.

## Troubleshooting

### Common Issues

**Cannot connect to cluster**
```bash
# Check Docker is running
docker ps

# Check cluster containers
docker ps | grep k3d-my-cluster

# Verify kubeconfig
kubectl config get-contexts | grep my-cluster
```

**Slow status check**
```bash
# Skip application checks
openframe cluster status my-cluster --no-apps

# Check specific issue
kubectl get nodes --context k3d-my-cluster
```

**Incomplete information**
```bash
# Use verbose mode for debugging
openframe cluster status my-cluster --verbose

# Check directly with k3d
k3d cluster list
k3d node list
```

## Health Checks

The status command performs these checks:

1. **Cluster Existence** - Verifies cluster is registered
2. **Container Health** - Checks Docker containers are running
3. **API Connectivity** - Tests Kubernetes API access
4. **Node Health** - Queries node readiness
5. **Application Health** - Checks Helm releases (optional)

## See Also

- [cluster](README.md) - Cluster command overview
- [cluster list](list.md) - List all clusters
- [cluster create](create.md) - Create a new cluster
- [cluster delete](delete.md) - Delete a cluster
- [cluster cleanup](cleanup.md) - Clean up resources

## Notes

- Status checks do not modify the cluster
- The command uses the cluster's kubectl context automatically
- Resource usage requires metrics-server (may not be available)
- Application status requires Helm to be installed in the cluster