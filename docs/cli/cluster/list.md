# cluster list

List all Kubernetes clusters managed by OpenFrame CLI.

## Synopsis

```bash
openframe cluster list [flags]
```

## Description

Displays information about all detected clusters from registered providers (currently K3d). Shows cluster name, type, status, and node count in a formatted table.

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--quiet` | `-q` | Only show cluster names | `false` |
| `--verbose` | `-v` | Show detailed information | `false` |
| `--dry-run` | - | Show what would be listed | `false` |
| `--force` | `-f` | Not used for list command | `false` |
| `--silent` | - | Suppress all output except errors | `false` |

## Output Formats

### Default Table Format

```
NAME                 TYPE       STATUS     NODES          
────────────────────────────────────────────────────────────
openframe-dev        k3d        Running    4              
test-cluster         k3d        Running    2              
prod-cluster         k3d        Stopped    5              
```

### Quiet Mode (`--quiet`)

```
openframe-dev
test-cluster
prod-cluster
```

### Verbose Mode (`--verbose`)

```
CLUSTER INFORMATION:
────────────────────────────────────────────────────────────
Name:         openframe-dev
Type:         k3d
Status:       Running
Nodes:        4 (1 control-plane, 3 workers)
Created:      2024-01-15 10:30:00
K8s Version:  v1.31.5-k3s1
Context:      k3d-openframe-dev
────────────────────────────────────────────────────────────
Name:         test-cluster
Type:         k3d
Status:       Running
Nodes:        2 (1 control-plane, 1 worker)
Created:      2024-01-14 14:20:00
K8s Version:  v1.31.5-k3s1
Context:      k3d-test-cluster
```

## Examples

### Basic Usage

```bash
# List all clusters
openframe cluster list

# Short alias
openframe k list
```

### Quiet Mode

```bash
# Get just cluster names (useful for scripts)
openframe cluster list --quiet

# Use in scripts
for cluster in $(openframe cluster list -q); do
    echo "Processing cluster: $cluster"
    openframe cluster status "$cluster"
done
```

### Verbose Output

```bash
# Detailed cluster information
openframe cluster list --verbose

# Combine with quiet for names only but with details
openframe cluster list -v
```

### Filtering and Processing

```bash
# Count clusters
openframe cluster list -q | wc -l

# Check if specific cluster exists
openframe cluster list -q | grep -q "my-cluster" && echo "Cluster exists"

# Get running clusters (with verbose mode)
openframe cluster list -v | grep "Status:.*Running"
```

## Cluster States

| Status | Description |
|--------|-------------|
| `Running` | Cluster is active and accessible |
| `Stopped` | Cluster exists but is not running |
| `Unknown` | Status cannot be determined |

## Empty List

When no clusters exist:

```
No clusters found.

To create a cluster, run:
  openframe cluster create
```

## Exit Codes

- `0` - List displayed successfully (even if empty)
- `1` - Failed to list clusters
- `2` - Provider communication error

## Performance

The list command queries multiple providers:
- K3d clusters via Docker API
- Future: GKE, EKS, AKS clusters via cloud APIs

Response time depends on:
- Number of clusters
- Docker daemon responsiveness
- Network latency (for cloud providers)

## Troubleshooting

### Common Issues

**No clusters shown but clusters exist**
```bash
# Check Docker is running
docker ps

# Check k3d directly
k3d cluster list

# Use verbose mode for debugging
openframe cluster list --verbose
```

**Slow response**
```bash
# Check Docker daemon
docker info

# List with timeout
timeout 5 openframe cluster list
```

**Permission issues**
```bash
# May need Docker permissions
groups | grep docker

# Or use sudo
sudo openframe cluster list
```

## Integration Examples

### Bash Script

```bash
#!/bin/bash
# List and check all clusters

clusters=$(openframe cluster list -q)
if [ -z "$clusters" ]; then
    echo "No clusters found"
    exit 1
fi

for cluster in $clusters; do
    echo "Checking: $cluster"
    openframe cluster status "$cluster" --no-apps
done
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: List OpenFrame clusters
  run: |
    openframe cluster list
    if openframe cluster list -q | grep -q "prod"; then
      echo "Production cluster found"
    fi
```

## See Also

- [cluster](README.md) - Cluster command overview
- [cluster create](create.md) - Create a new cluster
- [cluster status](status.md) - Show detailed cluster information
- [cluster delete](delete.md) - Delete a cluster

## Notes

- The list includes all clusters regardless of their current state
- Cluster detection is automatic across all supported providers
- The command never modifies clusters, only reads their state
- Output is sorted alphabetically by cluster name