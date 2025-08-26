# cluster delete

Delete a Kubernetes cluster and clean up all associated resources.

## Synopsis

```bash
openframe cluster delete [NAME] [flags]
```

## Description

Removes a Kubernetes cluster completely, including:
- Stopping all running containers
- Deleting the cluster
- Cleaning up Docker resources
- Removing kubectl configuration

If no cluster name is provided, displays an interactive list of available clusters to choose from.

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `NAME` | Cluster name to delete | No (interactive if omitted) |

## Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--force` | `-f` | Skip confirmation prompt | `false` |
| `--dry-run` | - | Show what would be deleted | `false` |
| `--verbose` | `-v` | Enable verbose output | `false` |
| `--silent` | - | Suppress all output except errors | `false` |

## Interactive Selection

When no cluster name is provided, the command shows an interactive selector:

```
Select a cluster to delete:
  > my-cluster     (k3d, 4 nodes)
    dev-cluster    (k3d, 2 nodes)
    test-cluster   (k3d, 3 nodes)

Use arrow keys to navigate, Enter to select, Ctrl+C to cancel
```

## Confirmation Prompt

By default, deletion requires confirmation (unless `--force` is used):

```
Are you sure you want to delete cluster "my-cluster"? (y/N)
```

## Examples

### Basic Usage

```bash
# Delete specific cluster with confirmation
openframe cluster delete my-cluster

# Interactive selection
openframe cluster delete
```

### Force Deletion

```bash
# Skip confirmation prompt
openframe cluster delete my-cluster --force

# Force delete with short flag
openframe cluster delete my-cluster -f
```

### Dry Run

```bash
# Preview what would be deleted
openframe cluster delete my-cluster --dry-run

# Dry run with force flag (shows skipped confirmation)
openframe cluster delete my-cluster --dry-run --force
```

### Scripting

```bash
# Silent mode for scripts
openframe cluster delete my-cluster --force --silent

# With error checking
if openframe cluster delete old-cluster --force; then
    echo "Cluster deleted successfully"
else
    echo "Failed to delete cluster"
fi
```

### Verbose Output

```bash
# Detailed deletion process
openframe cluster delete my-cluster --verbose
```

## Output

### Success Output

```
? Are you sure you want to delete cluster "my-cluster"? Yes

⠋ Deleting cluster "my-cluster"...
  • Stopping intercepts...
  • Removing cluster...
  • Cleaning up Docker resources...
  • Updating kubeconfig...

✓ Cluster "my-cluster" deleted successfully
```

### Dry Run Output

```
Would delete cluster "my-cluster":
  - Type: k3d
  - Nodes: 4
  - Created: 2024-01-15 10:30:00
  - Docker containers: 4
  - Docker volumes: 2
  - Docker networks: 1
```

### No Clusters Found

```
No clusters found to delete.
```

## Deletion Process

The deletion follows these steps:

1. **Validation**
   - Check if cluster exists
   - Detect cluster type

2. **Confirmation**
   - Prompt user (unless --force)

3. **Cleanup Operations**
   - Stop any running intercepts
   - Delete cluster via provider (k3d)
   - Remove Docker containers
   - Clean Docker volumes
   - Remove Docker networks

4. **Configuration**
   - Remove from kubectl config
   - Clean local state

## Exit Codes

- `0` - Cluster deleted successfully
- `1` - Deletion failed
- `4` - Cluster not found
- `130` - User cancelled (Ctrl+C or answered No)

## Resource Cleanup

The command removes:

| Resource | Description |
|----------|-------------|
| Containers | All cluster node containers |
| Volumes | Persistent data volumes |
| Networks | Cluster-specific networks |
| Images | Optionally with cleanup command |
| Kubectl Context | Cluster configuration |

## Troubleshooting

### Common Issues

**Cluster not found**
```bash
# List available clusters first
openframe cluster list

# Check if cluster exists
openframe cluster status my-cluster
```

**Deletion hangs**
```bash
# Use verbose mode to see progress
openframe cluster delete my-cluster --verbose

# Force cleanup if needed
docker rm -f $(docker ps -aq --filter "label=k3d.cluster=my-cluster")
```

**Permission denied**
```bash
# May need elevated permissions for Docker
sudo openframe cluster delete my-cluster
```

## Safety Features

- Confirmation prompt by default
- Cannot delete non-existent clusters
- Comprehensive cleanup ensures no orphaned resources
- Interactive selection prevents accidental deletion

## See Also

- [cluster](README.md) - Cluster command overview
- [cluster create](create.md) - Create a cluster
- [cluster list](list.md) - List all clusters
- [cluster cleanup](cleanup.md) - Clean resources without deleting

## Notes

- Deletion is irreversible - all cluster data is permanently removed
- The command handles cleanup even if cluster is in a broken state
- Docker resources are cleaned up even if k3d deletion fails
- Kubectl context is removed automatically